const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
// Test pure TypeScript modules without importing the React Native runtime.
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
const axios = require("axios");
const { ApiClient, unwrap, errorMessage } = require("../src/api/client.ts");
const {
  messagePayload,
  mergeMessages,
  mediaLinks,
} = require("../src/api/messaging.ts");
const { canMutate } = require("../src/api/types.ts");
const tokens = { accessToken: "access-one", refreshToken: "refresh-one" };
const user = {
  id: "user-one",
  fullName: "Test Agent",
  organization: { name: "Test Workspace" },
};
function harness(handler, baseUrl = "https://dev.kshanaapi.com/api/backend") {
  let saved = null;
  const calls = [];
  const client = new ApiClient(
    baseUrl,
    {
      read: async () => saved,
      write: async (value) => {
        saved = value;
      },
    },
    axios.create({
      adapter: async (config) => {
        const call = {
          path: config.url,
          method: config.method,
          headers: config.headers,
          withCredentials: config.withCredentials,
          data:
            typeof config.data === "string"
              ? JSON.parse(config.data)
              : config.data,
        };
        calls.push(call);
        const result = await handler(call);
        const response = {
          data: result.body ?? { success: true, data: result.data },
          status: result.status ?? 200,
          statusText: "",
          headers: {},
          config,
        };
        if (response.status >= 400)
          throw new axios.AxiosError(
            "Request failed",
            "ERR_BAD_RESPONSE",
            config,
            null,
            response,
          );
        return response;
      },
    }),
  );
  return {
    client,
    calls,
    saved: () => saved,
    seed: (value) => {
      saved = value;
    },
  };
}
function auth(call) {
  if (call.path === "/auth/login") return { data: tokens };
  if (call.path === "/auth/me") return { data: user };
}

test("login forwards workspace, unwraps user and uses proxy cookie; remember=false never persists tokens", async () => {
  const h = harness(
    (call) => auth(call) || { data: { items: [], meta: { total: 0 } } },
  );
  assert.deepEqual(
    await h.client.login(
      " agent@example.test ",
      "test-password",
      " workspace ",
      false,
    ),
    user,
  );
  assert.deepEqual(h.calls[0].data, {
    email: "agent@example.test",
    password: "test-password",
    organizationSlug: "workspace",
  });
  assert.equal(h.calls[1].headers.Cookie, "dealnexus_access_token=access-one");
  assert.equal(h.calls[1].headers.Authorization, undefined);
  assert.equal(h.saved(), null);
  assert.deepEqual(await h.client.get("/conversations?page=1"), {
    items: [],
    meta: { total: 0 },
  });
});
test("direct backend transport uses bearer authentication", async () => {
  const h = harness(auth, "https://backend.example.test/api");
  await h.client.login("agent@example.test", "test-password", "", true);
  assert.equal(h.calls[1].headers.Authorization, "Bearer access-one");
  assert.equal(h.calls[1].headers.Cookie, undefined);
  assert.deepEqual(h.saved().tokens, tokens);
});
test("concurrent 401s refresh only once, retry both requests and persist rotated tokens", async () => {
  let refreshes = 0;
  const h = harness(async (call) => {
    if (auth(call)) return auth(call);
    if (call.path === "/auth/refresh") {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return {
        data: { accessToken: "access-two", refreshToken: "refresh-two" },
      };
    }
    if (call.headers.Cookie === "dealnexus_access_token=access-one")
      return { status: 401 };
    return { data: { id: call.path } };
  });
  await h.client.login("agent@example.test", "test-password", "", true);
  const result = await Promise.all([
    h.client.get("/conversations"),
    h.client.get("/notifications"),
  ]);
  assert.equal(refreshes, 1);
  assert.equal(result.length, 2);
  assert.deepEqual(
    h.calls.find((call) => call.path === "/auth/refresh").data,
    tokens,
  );
  assert.equal(h.saved().tokens.accessToken, "access-two");
});
test("expired refresh clears session, but transient service errors preserve it", async () => {
  for (const status of [401, 503]) {
    let expired = 0;
    const h = harness(
      (call) =>
        auth(call) || { status: call.path === "/auth/refresh" ? status : 401 },
    );
    h.client.onSessionExpired = () => expired++;
    await h.client.login("agent@example.test", "test-password", "", true);
    await assert.rejects(h.client.get("/conversations"));
    assert.equal(expired, status === 401 ? 1 : 0);
    assert.equal(Boolean(h.saved()), status !== 401);
  }
});
test("logout during an in-flight refresh cannot resurrect authentication", async () => {
  let finishRefresh;
  let notifyStarted;
  const started = new Promise((resolve) => {
    notifyStarted = resolve;
  });
  const h = harness(async (call) => {
    if (auth(call)) return auth(call);
    if (call.path === "/auth/logout")
      return { data: { message: "Logged out" } };
    if (call.path === "/auth/refresh") {
      notifyStarted();
      return new Promise((resolve) => {
        finishRefresh = () =>
          resolve({
            data: { accessToken: "late", refreshToken: "late-refresh" },
          });
      });
    }
    return { status: 401 };
  });
  await h.client.login("agent@example.test", "test-password", "", true);
  const pending = h.client.get("/conversations");
  const rejected = assert.rejects(pending);
  await started;
  await h.client.logout();
  finishRefresh();
  await rejected;
  assert.equal(h.saved(), null);
  await assert.rejects(h.client.get("/conversations"));
});
test("restore binds saved credentials to their backend and retains them when offline", async () => {
  const h = harness(() => ({ status: 503 }));
  h.seed({ baseUrl: "https://other.example.test/api", tokens });
  assert.equal(await h.client.restore(), null);
  assert.equal(h.calls.length, 0);
  h.seed({ baseUrl: h.client.baseUrl, tokens });
  await assert.rejects(h.client.restore());
  assert.deepEqual(h.saved().tokens, tokens);
});
test("permission errors do not refresh or retry mutations; external URLs are rejected", async () => {
  const h = harness((call) => auth(call) || { status: 403 });
  await h.client.login("agent@example.test", "test-password", "", false);
  await assert.rejects(
    h.client.post("/conversations/id/messages", { content: "hello" }),
  );
  assert.equal(
    h.calls.filter((call) => call.path.includes("messages")).length,
    1,
  );
  await assert.rejects(h.client.get("https://untrusted.test/"));
  assert.equal(h.calls.length, 3);
});
test("messaging payload uses backend direction and raw uploaded storage references", () => {
  const file = {
    fileUrl: "https://storage.example.test/private/document.pdf",
    fileName: "document.pdf",
    size: 1024,
    mimeType: "application/pdf",
  };
  const note = messagePayload(" Team context ", true, file);
  assert.equal(note.direction, "INTERNAL_NOTE");
  assert.equal(note.senderType, "user");
  assert.equal(note.content, "Team context");
  assert.equal(note.mediaUrl, file.fileUrl);
  assert.equal(note.attachments[0].size, 1024);
  assert.equal(messagePayload("Hello", false).direction, "OUTGOING");
  assert.throws(() => messagePayload(" ", false));
});
test("message merge deduplicates history and replaces delivery status and signed URLs", () => {
  const old = { id: "m1", createdAt: "2026-09-07T01:00:00Z", status: "SENT" };
  const latest = {
    ...old,
    status: "READ",
    mediaUrl: "https://storage.test/a?signature=new",
  };
  assert.deepEqual(mergeMessages([old], [latest]), [latest]);
  assert.deepEqual(
    mediaLinks({
      ...latest,
      messageType: "IMAGE",
      attachments: [{ url: latest.mediaUrl }, { url: "javascript:alert(1)" }],
    }),
    [{ url: latest.mediaUrl, name: "Photo" }],
  );
});
test("read-only plans and missing permissions disable sending", () => {
  assert.equal(
    canMutate(
      {
        permissions: ["conversations.send"],
        entitlements: { canMutate: false },
      },
      "conversations.send",
    ),
    false,
  );
  assert.equal(canMutate({ permissions: [] }, "conversations.send"), false);
  assert.equal(
    canMutate(
      { permissions: ["conversations.internal_note"] },
      "conversations.internal_note",
    ),
    true,
  );
});
test("malformed envelopes and backend validation messages are surfaced", () => {
  assert.throws(() => unwrap("<html>Not found</html>"));
  assert.throws(
    () => unwrap({ success: false, message: "Not allowed" }),
    /Not allowed/,
  );
  const error = new axios.AxiosError("", "", undefined, null, {
    data: { message: ["Invalid email", "Missing password"] },
  });
  assert.equal(errorMessage(error), "Invalid email\nMissing password");
});
const { workspaceUrl } = require("../src/api/workspace.ts");
test("workspace session bootstrap uses a secure same-origin header without exposing access tokens", async () => {
  const h = harness(auth);
  await h.client.login("test@example.com", "test", "test", false);
  const source = h.client.workspaceSource("https://dev.kshanaapi.com");
  assert.equal(source.uri, "https://dev.kshanaapi.com/api/auth/socket-token");
  assert.match(source.headers.Cookie, /dealnexus_refresh_token=refresh-one/);
  assert.ok(!JSON.stringify(source).includes(tokens.accessToken));
  assert.throws(() => h.client.workspaceSource("https://evil.example"));
  assert.throws(() => h.client.workspaceSource("http://dev.kshanaapi.com"));
  assert.throws(() =>
    h.client.workspaceSource("https://dev.kshanaapi.com/app"),
  );
  await h.client.clear();
  assert.throws(() => h.client.workspaceSource("https://dev.kshanaapi.com"));
});
test("workspace links reject foreign origins and paths outside authenticated workspace", () => {
  const site = "https://dev.kshanaapi.com";
  assert.equal(
    workspaceUrl(site, "/app/templates/new"),
    site + "/app/templates/new",
  );
  for (const path of [
    "//evil.example/app",
    "/app/../../api/auth/logout",
    "javascript:alert(1)",
    "/login",
    "https://x@evil.example/app",
  ]) {
    assert.throws(() => workspaceUrl(site, path));
  }
});
test("logout revokes an embedded-workspace refreshed session without restoring local tokens", async () => {
  let attempts = 0;
  const h = harness((call) => {
    if (call.path === "/auth/logout")
      return ++attempts === 1 ? { status: 401 } : { data: {} };
    if (call.path === "/auth/refresh")
      return {
        data: { accessToken: "latest", refreshToken: tokens.refreshToken },
      };
    return auth(call);
  });
  await h.client.login("test@example.com", "test", "test", true);
  await h.client.logout();
  assert.equal(attempts, 2);
  assert.equal(h.saved(), null);
  assert.equal(h.calls.at(-1).headers.Cookie, "dealnexus_access_token=latest");
  await assert.rejects(h.client.get("/auth/me"));
});

test("workspace preparation accepts server HttpOnly cookies and synchronizes the native access token", async () => {
  const h = harness((call) =>
    call.path.includes("socket-token")
      ? { body: { success: true, accessToken: "workspace-access" } }
      : auth(call),
  );
  await h.client.login("test@example.com", "test", "test", true);
  await h.client.prepareWorkspace("https://dev.kshanaapi.com");
  const bootstrap = h.calls.find((c) => c.path.includes("socket-token"));
  assert.equal(bootstrap.withCredentials, true);
  assert.equal(h.saved().tokens.accessToken, "workspace-access");
  await h.client.get("/auth/me");
  assert.equal(
    h.calls.at(-1).headers.Cookie,
    "dealnexus_access_token=workspace-access",
  );
});
test("a workspace preparation response cannot restore a signed-out account", async () => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const h = harness((call) =>
    call.path.includes("socket-token") ? pending : auth(call),
  );
  await h.client.login("test@example.com", "test", "test", true);
  const preparing = h.client.prepareWorkspace("https://dev.kshanaapi.com");
  await h.client.clear();
  release({ body: { success: true, accessToken: "too-late" } });
  await assert.rejects(preparing);
  assert.equal(h.saved(), null);
});
const { parseWorkspaceExport } = require("../src/api/workspaceExport.ts");
test("mobile exports keep filenames inside the export cache and reject malformed payloads", () => {
  const file = parseWorkspaceExport(
    JSON.stringify({
      type: "kshana-export",
      name: "../../private/report.csv",
      mime: "text/csv;charset=utf-8",
      base64: Buffer.from("id,name\n1,Example").toString("base64"),
    }),
  );
  assert.ok(!file.name.includes("/"));
  assert.ok(!file.name.startsWith("."));
  assert.equal(file.mime, "text/csv");
  assert.throws(() =>
    parseWorkspaceExport(
      JSON.stringify({ type: "kshana-export", base64: "invalid!" }),
    ),
  );
  assert.equal(parseWorkspaceExport('{"type":"unrelated"}'), null);
});

test("embedded exports survive detached anchor clicks and immediate blob revocation", async () => {
  const vm = require("node:vm");
  const { workspaceScript } = require("../src/api/workspaceExport.ts");
  let exported;
  const complete = new Promise((resolve) => {
    exported = resolve;
  });
  class Anchor {
    click() {
      throw new Error("Blob export escaped the mobile bridge");
    }
  }
  class Reader {
    readAsDataURL(blob) {
      blob.arrayBuffer().then((bytes) => {
        this.result =
          "data:text/csv;base64," + Buffer.from(bytes).toString("base64");
        this.onload();
      });
    }
  }
  const revoked = [];
  const context = {
    location: {
      origin: "https://dev.kshanaapi.com",
      pathname: "/app/billing/invoices",
    },
    window: { ReactNativeWebView: { postMessage: exported } },
    document: {
      getElementById: () => null,
      createElement: () => ({}),
      head: { appendChild() {} },
      addEventListener() {},
    },
    URL: {
      createObjectURL: () => "blob:test",
      revokeObjectURL: (url) => revoked.push(url),
    },
    HTMLAnchorElement: Anchor,
    FileReader: Reader,
    Map,
  };
  vm.runInNewContext(workspaceScript("https://dev.kshanaapi.com"), context);
  const anchor = new Anchor();
  anchor.href = context.URL.createObjectURL(
    new Blob(["id,name\n1,Mobile"], { type: "text/csv" }),
  );
  anchor.download = "mobile.csv";
  anchor.click();
  context.URL.revokeObjectURL(anchor.href);
  const file = parseWorkspaceExport(await complete);
  assert.equal(file.name, "mobile.csv");
  assert.equal(
    Buffer.from(file.base64, "base64").toString(),
    "id,name\n1,Mobile",
  );
  assert.deepEqual(revoked, ["blob:test"]);
});

test("workspace readiness hides the web splash until actual page content is available", () => {
  const vm = require("node:vm");
  const { workspaceReadinessScript } = require("../src/api/workspace.ts");
  let loading = true,
    content = false,
    notify,
    observers = 0;
  const events = [];
  const context = {
    location: {
      origin: "https://dev.kshanaapi.com",
      pathname: "/app/campaigns",
    },
    window: {
      ReactNativeWebView: {
        postMessage: (text) => events.push(JSON.parse(text).ready),
      },
    },
    document: {
      documentElement: {},
      querySelector: (selector) =>
        selector === ".onboarding-loader-shell"
          ? loading
            ? {}
            : null
          : selector === "main" && content
            ? { children: [{}] }
            : null,
    },
    MutationObserver: class {
      constructor(callback) {
        notify = callback;
      }
      observe() {
        observers++;
      }
    },
  };
  const script = workspaceReadinessScript(context.location.origin);
  vm.runInNewContext(script, context);
  assert.deepEqual(events, [false]);
  content = true;
  notify();
  assert.deepEqual(events, [false]);
  loading = false;
  notify();
  assert.deepEqual(events, [false, true]);
  notify();
  assert.deepEqual(events, [false, true]);
  vm.runInNewContext(script, context);
  assert.equal(observers, 1);
  assert.deepEqual(events, [false, true, true]);
});

const {
  isMobilePurchaseUrl,
  mobilePurchaseGuardScript,
} = require("../src/api/mobilePurchases.ts");
test("mobile workspace blocks purchase routes while retaining business modules", () => {
  const origin = "https://kshanaapi.com";
  for (const path of [
    "/app/billing",
    "/app/billing/invoices/123/pay",
    "/app/%62illing/plans",
    "/app/usage",
    "/app/meta-payments",
    "/pricing",
    "https://checkout.razorpay.com/v1/checkout.js",
  ]) {
    assert.equal(isMobilePurchaseUrl(path, origin), true, path);
    assert.throws(() => workspaceUrl(origin, path));
  }
  for (const path of [
    "/app/inbox",
    "/app/reports",
    "/app/templates",
    "/app/automation",
    "/app/contacts",
    "/support",
  ])
    assert.equal(isMobilePurchaseUrl(path, origin), false, path);
});
test("embedded purchase guard blocks SPA and popup checkout without breaking workspace routing", () => {
  const vm = require("node:vm");
  const calls = [];
  const handlers = {};
  const styleCalls = [];
  const banner = {
    style: {
      setProperty(...args) {
        styleCalls.push(args);
      },
    },
  };
  const anchor = {
    href: "https://kshanaapi.com/app/billing",
    style: {
      setProperty(...args) {
        styleCalls.push(args);
      },
    },
    closest() {
      return banner;
    },
  };
  const context = {
    URL,
    location: { origin: "https://kshanaapi.com" },
    window: {
      open(url) {
        calls.push(url);
      },
    },
    history: {
      pushState(s, t, url) {
        calls.push(url);
      },
      replaceState(s, t, url) {
        calls.push(url);
      },
    },
    document: {
      documentElement: {},
      querySelectorAll() {
        return [anchor];
      },
      addEventListener(n, fn) {
        handlers[n] = fn;
      },
    },
    MutationObserver: class {
      observe() {}
    },
  };
  vm.runInNewContext(
    mobilePurchaseGuardScript(context.location.origin),
    context,
  );
  context.history.pushState({}, "", "/app/billing/plans");
  context.history.replaceState({}, "", "/pricing");
  context.window.open("https://checkout.razorpay.com");
  assert.deepEqual(calls, []);
  context.history.pushState({}, "", "/app/reports");
  assert.deepEqual(calls, ["/app/reports"]);
  let prevented = false,
    stopped = false;
  handlers.click({
    target: {
      closest() {
        return anchor;
      },
    },
    preventDefault() {
      prevented = true;
    },
    stopImmediatePropagation() {
      stopped = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(stopped, true);
  assert.equal(styleCalls.length, 2);
});

test("embedded viewport reveals obscured fields on keyboard resize and stays origin scoped", () => {
  const vm = require("node:vm");
  const {
    workspaceViewportScript,
  } = require("../src/api/workspaceViewport.ts");
  const events = {},
    sizes = [],
    reveals = [];
  let mounted = false;
  const viewport = {
    height: 700,
    offsetTop: 0,
    addEventListener: (name, fn) => {
      events[name] = fn;
    },
  };
  const context = {
    location: { origin: "https://kshanaapi.com" },
    window: { visualViewport: viewport, addEventListener() {} },
    requestAnimationFrame: (fn) => fn(),
    document: {
      head: {
        appendChild() {
          mounted = true;
        },
      },
      getElementById: () => mounted,
      createElement: () => ({}),
      documentElement: {
        style: { setProperty: (key, value) => sizes.push(value) },
      },
      addEventListener() {},
      activeElement: {
        matches: () => true,
        getBoundingClientRect: () => ({ top: 400, bottom: 450 }),
        scrollIntoView: (options) => reveals.push(options),
      },
    },
  };
  vm.runInNewContext(workspaceViewportScript("https://kshanaapi.com"), context);
  viewport.height = 300;
  events.resize();
  assert.equal(sizes.at(-1), "300px");
  assert.equal(reveals.length, 1);
  viewport.height = 700;
  events.resize();
  assert.equal(sizes.at(-1), "700px");
  assert.equal(reveals.length, 1);
  vm.runInNewContext(workspaceViewportScript("https://kshanaapi.com"), {
    location: { origin: "https://elsewhere.example" },
  });
});
