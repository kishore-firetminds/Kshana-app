const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { create, act } = require("react-test-renderer");
global.IS_REACT_ACT_ENVIRONMENT = true;
function compile(path, mocks) {
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
      require(name) {
        if (!(name in mocks)) throw Error(name);
        return mocks[name];
      },
    },
  );
  return exports;
}
async function harness(overrides = {}, props = {}) {
  const requests = [],
    confirmations = [],
    starts = [];
  let focused = true;
  const user = {
    id: "qa-user",
    organizationId: "qa-org",
    permissions: ["conversations.send"],
  };
  let permission = {
    status: "ALLOWED",
    canCall: true,
    canRequest: true,
    windowOpen: true,
    checkedAt: new Date().toISOString(),
    templates: [],
  };
  const calling = {
    enabled: true,
    canHandle: true,
    state: {
      senders: [
        { phoneNumberId: "qa-sender", displayPhoneNumber: "+15550000001" },
      ],
      outboundCalling: { enabled: true },
    },
    controller: {
      activeId: null,
      async start(...args) {
        starts.push(args);
      },
    },
    async refresh() {},
    ...overrides,
  };
  const controller = compile("src/calling/controller.ts", {});
  const { MobileCallOptions } = compile("src/calling/MobileCallOptions.tsx", {
    react: React,
    "react-native": {
      Alert: { alert: (...args) => confirmations.push(args) },
      Modal: "Modal",
      Pressable: "Pressable",
      ScrollView: "ScrollView",
      View: "View",
    },
    "expo-crypto": { randomUUID: () => "00000000-0000-4000-8000-000000000001" },
    "@react-navigation/native": { useIsFocused: () => focused },
    "../api": {
      api: {
        async post(path, body) {
          requests.push({ path, body });
          return path.endsWith("/permission") ? permission : { status: "SENT" };
        },
      },
    },
    "../store": { useAppStore: (selector) => selector({ user }) },
    "../api/client": { errorMessage: (error) => error.message },
    "../liveUi": { Button: "Button", Field: "Field", l: {} },
    "../themedText": { Text: "Text" },
    "./MobileCallingProvider": { useMobileCalling: () => calling },
    "./controller": controller,
  });
  let renderer;
  await act(async () => {
    renderer = create(
      React.createElement(MobileCallOptions, {
        phone: "+15550000002",
        ...props,
      }),
    );
  });
  return {
    renderer,
    requests,
    confirmations,
    starts,
    permission(value) {
      permission = { ...permission, ...value };
    },
    async click(title) {
      await act(async () => {
        renderer.root.findByProps({ title }).props.onPress();
      });
    },
    async confirm() {
      await act(async () => {
        confirmations
          .at(-1)[2]
          .find((button) => button.onPress)
          .onPress();
      });
    },
    async rerender() {
      await act(async () => {
        renderer.update(
          React.createElement(MobileCallOptions, {
            phone: "+15550000002",
            ...props,
          }),
        );
      });
    },
    async blur() {
      focused = false;
      await this.rerender();
    },
    async close() {
      await act(async () => renderer.unmount());
    },
  };
}
test("calling options opening/checking permission never sends a request or dials automatically", async () => {
  const h = await harness();
  assert.equal(h.requests.length, 0);
  await h.click("Check customer permission");
  assert.deepEqual(
    h.requests.map((r) => r.path),
    ["/whatsapp-calls/outbound/permission"],
  );
  assert.equal(h.starts.length, 0);
  await h.click("Call customer");
  assert.equal(h.starts.length, 0);
  await h.confirm();
  assert.equal(h.starts.length, 1);
  assert.equal(h.starts[0][0].phoneNumberId, "qa-sender");
  await h.close();
});
test("changing customer after confirmation prevents stale dialing", async () => {
  const h = await harness();
  await h.click("Check customer permission");
  await h.click("Call customer");
  await act(async () =>
    h.renderer.root
      .findByProps({ label: "Customer number" })
      .props.onChangeText("+15550000003"),
  );
  await h.confirm();
  assert.equal(h.starts.length, 0);
  await h.close();
});
test("leaving inbox calling options invalidates a pending confirmation", async () => {
  const h = await harness();
  await h.click("Check customer permission");
  await h.click("Call customer");
  await h.blur();
  await h.confirm();
  assert.equal(h.starts.length, 0);
  await h.close();
});
test("requesting permission requires separate confirmation and never dials", async () => {
  const h = await harness();
  h.permission({ canCall: false });
  await h.click("Check customer permission");
  await h.click("Request permission");
  assert.equal(h.requests.length, 1);
  await h.confirm();
  assert.equal(
    h.requests.at(-1).path,
    "/whatsapp-calls/outbound/permission-request",
  );
  assert.equal(h.starts.length, 0);
  assert.equal(h.requests.at(-1).body.recipient, "+15550000002");
  await h.close();
});
test("closed message window requires choosing a returned approved permission template", async () => {
  const h = await harness();
  h.permission({
    canCall: false,
    windowOpen: false,
    templates: [{ id: "approved-qa", name: "qa_permission", language: "en" }],
  });
  await h.click("Check customer permission");
  assert.equal(
    h.renderer.root.findByProps({ title: "Request permission" }).props.disabled,
    true,
  );
  await h.click("Choose approved permission template");
  await act(async () =>
    h.renderer.root
      .findAllByType("Pressable")
      .find((node) =>
        node
          .findAllByType("Text")
          .some((text) => text.props.children === "qa_permission (en)"),
      )
      .props.onPress(),
  );
  await h.click("Request permission");
  await h.confirm();
  assert.equal(h.requests.at(-1).body.templateId, "approved-qa");
  assert.equal(h.starts.length, 0);
  await h.close();
});
test("inbox sender cannot fall back to a different accessible sender", async () => {
  const h = await harness(
    {},
    { conversationId: "qa-chat", phoneNumberId: "revoked-sender" },
  );
  assert.equal(
    h.renderer.root.findByProps({ title: "Check customer permission" }).props
      .disabled,
    true,
  );
  assert.equal(h.requests.length, 0);
  await h.close();
});
test("read-only, unsupported and unfocused builds offer no mutation controls", async () => {
  for (const overrides of [{ enabled: false }, { canHandle: false }]) {
    const h = await harness(overrides);
    assert.equal(h.renderer.toJSON(), null);
    assert.equal(h.requests.length, 0);
    await h.close();
  }
  const h = await harness();
  await h.blur();
  assert.equal(h.renderer.toJSON(), null);
  await h.close();
});
