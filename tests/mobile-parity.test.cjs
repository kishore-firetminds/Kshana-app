const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { create, act } = require("react-test-renderer");
const axios = require("axios");
global.IS_REACT_ACT_ENVIRONMENT = true;

function compile(path, mocks = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    {
      exports,
      require: (name) => {
        if (!(name in mocks)) throw Error(`Missing mock ${name}`);
        return mocks[name];
      },
      URL,
      AbortController,
      setInterval,
      clearInterval,
    },
  );
  return exports;
}
const messaging = compile("src/api/messaging.ts");

test("WhatsApp service window rejects absent, invalid, future and expired timestamps", () => {
  const now = Date.parse("2026-11-25T10:00:00Z");
  const conversation = { id: "qa", channelType: "WHATSAPP" };
  for (const lastInboundAt of [
    undefined,
    "invalid",
    new Date(now + 1).toISOString(),
    new Date(now - 86400000).toISOString(),
  ]) {
    assert.equal(
      messaging.hasReplyWindow({ ...conversation, lastInboundAt }, now),
      false,
    );
  }
  assert.equal(
    messaging.hasReplyWindow(
      {
        ...conversation,
        lastInboundAt: new Date(now - 86399999).toISOString(),
      },
      now,
    ),
    true,
  );
  assert.equal(messaging.hasReplyWindow({ channelType: "EMAIL" }, now), true);
  assert.equal(messaging.hasReplyWindow(null, now), false);
});

test("new web entry points keep permission checks and purchase restrictions", () => {
  const types = compile("src/api/types.ts");
  const access = compile("src/access.ts", { "./api/types": types });
  const purchases = compile("src/api/mobilePurchases.ts");
  const user = {
    id: "qa",
    role: "AGENT",
    permissions: ["contacts.read", "ai_agents.read", "conversations.read.own"],
  };
  for (const path of [
    "/app/contacts/segments",
    "/app/contacts/attributes",
    "/app/ai-agents",
    "/app/inbox?conversation=qa",
  ]) {
    assert.equal(access.canAccessWorkspacePath(user, path), true, path);
    assert.equal(
      purchases.isMobilePurchaseUrl(path, "https://workspace.invalid"),
      false,
    );
  }
  assert.equal(access.canAccessWorkspacePath(user, "/app/companies"), false);
  assert.equal(
    access.canAccessWorkspacePath(
      { ...user, permissions: ["companies.read"] },
      "/app/companies",
    ),
    true,
  );
  assert.equal(
    access.canAccessWorkspacePath(user, "/app/platform/calling"),
    false,
  );
  assert.equal(
    access.canAccessWorkspacePath(
      user,
      "/app/ai-agents",
      "https://external.invalid",
    ),
    true,
  );
  assert.equal(
    access.canAccessWorkspacePath(
      user,
      "https://foreign.invalid/app/ai-agents",
      "https://workspace.invalid",
    ),
    false,
  );
  assert.equal(
    purchases.isMobilePurchaseUrl(
      "/app/billing/checkout",
      "https://workspace.invalid",
    ),
    true,
  );
  assert.equal(
    access.canAccessRoute({ ...user, permissions: [] }, "AiAgents"),
    false,
  );
});

async function resourceHarness() {
  const requests = [];
  let latest,
    account = { organizationId: "qa-org", id: "qa-user" };
  class ApiError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  }
  const { useResource } = compile("src/useResource.ts", {
    react: React,
    axios,
    "react-native": {
      AppState: {
        currentState: "active",
        addEventListener: () => ({ remove() {} }),
      },
    },
    "@react-navigation/native": {
      useFocusEffect: (callback) => React.useEffect(callback, [callback]),
    },
    "./api": {
      api: {
        request: (path, config) =>
          new Promise((resolve, reject) =>
            requests.push({ path, config, resolve, reject }),
          ),
      },
    },
    "./api/client": { ApiError, errorMessage: (error) => error.message },
    "./store": { useAppStore: (selector) => selector({ user: account }) },
  });
  function Probe(props) {
    latest = useResource("/qa", 0, props.scope, props.sender);
    return null;
  }
  let renderer;
  await act(async () => {
    renderer = create(
      React.createElement(Probe, { scope: "one", sender: "sender-one" }),
    );
  });
  return {
    requests,
    ApiError,
    get latest() {
      return latest;
    },
    setAccount(value) {
      account = value;
    },
    update: async (props) =>
      act(async () => renderer.update(React.createElement(Probe, props))),
    close: async () => act(async () => renderer.unmount()),
  };
}

test("resource switching sender clears cached results and rejects late prior responses", async () => {
  const h = await resourceHarness();
  const first = h.requests[0];
  assert.equal(
    first.config.headers["x-whatsapp-phone-number-id"],
    "sender-one",
  );
  await h.update({ scope: "two", sender: "sender-two" });
  assert.equal(first.config.signal.aborted, true);
  assert.equal(h.latest.data, null);
  await act(async () => first.resolve({ private: "old sender" }));
  assert.equal(h.latest.data, null);
  await act(async () => h.requests[1].resolve({ sender: "two" }));
  assert.equal(h.latest.data.sender, "two");
  h.setAccount({ organizationId: "other-org", id: "other-user" });
  await h.update({ scope: "two", sender: "sender-two" });
  assert.equal(h.latest.data, null);
  await h.close();
});

test("resource drops cached private values on ApiError 401/403/404 but preserves offline data", async () => {
  for (const status of [401, 403, 404]) {
    const h = await resourceHarness();
    await act(async () => h.requests[0].resolve({ private: "qa fixture" }));
    let refresh;
    await act(async () => {
      refresh = h.latest.refresh();
    });
    await act(async () => {
      h.requests[1].reject(Error("Offline"));
      await refresh;
    });
    assert.equal(h.latest.data.private, "qa fixture");
    await act(async () => {
      refresh = h.latest.refresh();
    });
    await act(async () => {
      h.requests[2].reject(new h.ApiError("Access revoked", status));
      await refresh;
    });
    assert.equal(h.latest.data, null);
    await h.close();
  }
});

async function numberHarness(
  Component,
  user = { role: "OWNER", entitlements: { canMutate: true } },
) {
  const resource = {
    data: {
      enabled: true,
      revision: 1,
      activePhoneNumberId: "one",
      accounts: [
        { phoneNumberId: "one", displayPhoneNumber: "+15550000001" },
        { phoneNumberId: "two", displayPhoneNumber: "+15550000002" },
      ],
      members: [
        {
          id: "member",
          fullName: "QA Member",
          email: "qa@example.test",
          role: "AGENT",
        },
      ],
      assignments: [],
    },
    loading: false,
    refresh: async () => {},
  };
  const posts = [];
  let resolvePost;
  const helpers = compile("src/api/numberAccess.ts");
  const components = compile("src/WhatsappNumberAccess.tsx", {
    react: React,
    "react-native": Object.assign(
      Object.fromEntries(
        ["Modal", "Pressable", "ScrollView", "View"].map((name) => [
          name,
          name,
        ]),
      ),
      { Alert: { alert() {} } },
    ),
    "lucide-react-native": {
      Check: "Check",
      ChevronDown: "ChevronDown",
      Phone: "Phone",
      ShieldCheck: "ShieldCheck",
    },
    "./themedText": { Text: "Text" },
    "./figmaComponents": { BrandHeader: "BrandHeader" },
    "./liveUi": {
      Button: "Button",
      Feedback: "Feedback",
      Field: "Field",
      l: {},
    },
    "./useResource": { useResource: () => resource },
    "./store": { useAppStore: (selector) => selector({ user }) },
    "./api": {
      api: {
        post: (path, body) => {
          posts.push({ path, body });
          return new Promise((resolve) => {
            resolvePost = resolve;
          });
        },
      },
    },
    "./api/client": { errorMessage: (error) => error.message },
    "./api/numberAccess": helpers,
    "./figmaTheme": { ui: {} },
  });
  const element = React.createElement(components[Component], {
    onChanged() {},
    navigation: { openDrawer() {} },
  });
  let renderer;
  await act(async () => {
    renderer = create(element);
  });
  return {
    resource,
    posts,
    renderer,
    update: async () =>
      act(async () => renderer.update(React.cloneElement(element))),
    resolve: async () => act(async () => resolvePost(resource.data)),
    close: async () => act(async () => renderer.unmount()),
  };
}

test("number switching is locked against double taps", async () => {
  const h = await numberHarness("MemberNumberSelector");
  const radio = h.renderer.root.findAllByProps({
    accessibilityRole: "radio",
  })[1];
  await act(async () => {
    radio.props.onPress();
    radio.props.onPress();
  });
  assert.equal(h.posts.length, 1);
  assert.equal(h.posts[0].path, "/integrations/whatsapp/active-number");
  await h.resolve();
  await h.close();
});

test("number management hides retained drafts after access revocation and disables read-only saving", async () => {
  const h = await numberHarness("NumberAccessScreen");
  assert.equal(
    h.renderer.root.findAllByProps({ title: "Save assignments" }).length,
    1,
  );
  h.resource.data = null;
  await h.update();
  assert.equal(
    h.renderer.root.findAllByProps({ title: "Save assignments" }).length,
    0,
  );
  await h.close();
  const readonly = await numberHarness("NumberAccessScreen", {
    role: "OWNER",
    entitlements: { canMutate: false },
  });
  assert.equal(
    readonly.renderer.root.findByProps({ title: "Save assignments" }).props
      .disabled,
    true,
  );
  await readonly.close();
});

test("mobile call history delegates audio to the gated native calling provider", () => {
  const source = fs.readFileSync("src/MobileCallsScreen.tsx", "utf8");
  assert.match(source, /useMobileCalling\(\)/);
  assert.doesNotMatch(
    source,
    /api\.(?:post|patch)|getUserMedia|MediaRecorder|requestPermissionsAsync/,
  );
  assert.match(
    source.replace(/\s+/g, " "),
    /Background and lock-screen ringing are not available yet/,
  );
});

test("embedded call links route to native history and unsupported audio controls stay hidden", () => {
  const calls = compile("src/api/workspaceCalling.ts");
  const events = [],
    history = [],
    handlers = {};
  let style;
  const origin = "https://workspace.invalid";
  const context = {
    URL,
    location: { origin },
    window: {
      ReactNativeWebView: {
        postMessage: (value) => events.push(JSON.parse(value)),
      },
      open: (url) => history.push(url),
    },
    history: {
      pushState: (s, t, url) => history.push(url),
      replaceState: (s, t, url) => history.push(url),
    },
    document: {
      head: {
        appendChild: (element) => {
          style = element.textContent;
        },
      },
      getElementById: () => null,
      createElement: () => ({}),
      addEventListener: (name, fn) => {
        handlers[name] = fn;
      },
    },
  };
  vm.runInNewContext(calls.workspaceCallingScript(origin), context);
  assert.match(style, /Call customer/);
  assert.match(style, /Incoming WhatsApp call/);
  let prevented = false;
  handlers.click({
    target: {
      closest: () => ({ href: `${origin}/app/calls?conversationId=qa` }),
    },
    preventDefault() {
      prevented = true;
    },
    stopImmediatePropagation() {},
  });
  context.history.pushState(null, "", "/app/calls");
  context.window.open("/app/calls");
  assert.equal(prevented, true);
  assert.equal(events.length, 3);
  assert.ok(
    events.every((event) => event.type === "kshana-mobile-call-history"),
  );
  assert.equal(history.length, 0);
  context.history.pushState(null, "", "/app/contacts");
  assert.deepEqual(history, ["/app/contacts"]);
  assert.equal(
    calls.isWorkspaceCallingUrl(`${origin}/app/calls`, origin),
    true,
  );
  assert.equal(
    calls.isWorkspaceCallingUrl("https://foreign.invalid/app/calls", origin),
    false,
  );
  assert.equal(calls.isWorkspaceCallingUrl("/app/calls-fake", origin), false);
  vm.runInNewContext(calls.workspaceCallingScript(origin), {
    location: { origin: "https://foreign.invalid" },
  });
});
