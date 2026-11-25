const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { create, act } = require("react-test-renderer");
global.IS_REACT_ACT_ENVIRONMENT = true;

async function harness(overrides = {}) {
  let focused = overrides.focused !== false;
  const requests = [],
    used = [],
    capabilityPaths = [];
  const capabilities = {
    data: {
      aiAssistanceEnabled: true,
      suggestedDraftsEnabled: true,
      conversationSummaryEnabled: true,
      policyVersion: "qa-v1",
    },
  };
  const mocks = {
    react: React,
    "@react-navigation/native": { useIsFocused: () => focused },
    "react-native": { View: "View", Modal: "Modal" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "./KeyboardLayout": { ScrollView: "ScrollView" },
    "./themedText": { Text: "Text", TextInput: "TextInput" },
    "./liveUi": { Button: "Button", l: {} },
    "./api": {
      api: {
        request: (path, config) =>
          new Promise((resolve, reject) =>
            requests.push({ path, config, resolve, reject }),
          ),
      },
    },
    "./api/client": { errorMessage: (error) => error.message },
    "./useResource": {
      useResource: (path) => {
        capabilityPaths.push(path);
        return capabilities;
      },
    },
  };
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync("src/MobileAiAssistance.tsx", "utf8"), {
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
      AbortController,
    },
  );
  const Component = exports.MobileAiAssistance;
  let props = {
    conversationId: "qa-chat",
    phoneNumberId: "qa-sender",
    contextKey: "qa-context",
    allowed: true,
    canSuggest: true,
    hasDraft: false,
    onUse: (text) => used.push(text),
    ...overrides,
  };
  let renderer;
  await act(async () => {
    renderer = create(React.createElement(Component, props));
  });
  return {
    requests,
    used,
    capabilityPaths,
    capabilities,
    renderer,
    update: async (changes) =>
      act(async () => {
        if ("focused" in changes) focused = changes.focused;
        props = { ...props, ...changes };
        renderer.update(React.createElement(Component, props));
      }),
    press: async (title) =>
      act(async () => renderer.root.findByProps({ title }).props.onPress()),
    close: async () => act(async () => renderer.unmount()),
  };
}

test("AI generation and edited review never send a message automatically", async () => {
  const h = await harness();
  const handler = h.renderer.root.findByProps({ title: "Suggest reply" }).props
    .onPress;
  await act(async () => {
    handler();
    handler();
  });
  assert.equal(h.requests.length, 1);
  assert.equal(
    h.requests[0].path,
    "/ai-assistance/conversations/qa-chat/suggest-reply",
  );
  assert.equal(
    h.requests[0].config.headers["x-whatsapp-phone-number-id"],
    "qa-sender",
  );
  await h.update({ hasDraft: true });
  await act(async () =>
    h.requests[0].resolve({ draft: "Synthetic AI proposal" }),
  );
  assert.equal(h.used.length, 0);
  await act(async () =>
    h.renderer.root
      .findByProps({ accessibilityLabel: "Review AI reply" })
      .props.onChangeText("Human-edited proposal"),
  );
  await h.press("Replace message with AI draft");
  assert.deepEqual(h.used, ["Human-edited proposal"]);
  assert.equal(h.requests.length, 1);
  assert.equal(
    h.requests.some((r) => r.path.includes("/messages")),
    false,
  );
  await h.close();
});

test("new messages, account context and revoked capability invalidate late AI responses", async () => {
  for (const next of [
    { contextKey: "new message" },
    { conversationId: "other-chat" },
    { phoneNumberId: "other-sender" },
    { allowed: false },
    { focused: false },
  ]) {
    const h = await harness();
    await h.press("Suggest reply");
    await h.update(next);
    assert.equal(h.requests[0].config.signal.aborted, true);
    await act(async () =>
      h.requests[0].resolve({ draft: "Stale private proposal" }),
    );
    assert.equal(
      h.renderer.root.findAllByProps({ accessibilityLabel: "Review AI reply" })
        .length,
      0,
    );
    assert.equal(h.used.length, 0);
    await h.close();
  }
});

test("permission and workspace toggles hide AI controls and never trigger generation", async () => {
  const h = await harness({ allowed: false });
  assert.equal(h.capabilityPaths.filter(Boolean).length, 0);
  assert.equal(h.renderer.root.findAllByType("Button").length, 0);
  await h.update({ allowed: true });
  h.capabilities.data.aiAssistanceEnabled = false;
  await h.update({});
  assert.equal(h.renderer.root.findAllByType("Button").length, 0);
  assert.equal(h.requests.length, 0);
  await h.close();
});

test("summaries are plain text, do not use composer callbacks, and can be reopened without another request", async () => {
  const h = await harness({ canSuggest: false });
  assert.equal(
    h.renderer.root.findByProps({ title: "Suggest reply" }).props.disabled,
    true,
  );
  await h.press("Summarize conversation");
  await act(async () =>
    h.requests[0].resolve({
      summary: "<script>Synthetic summary only</script>",
    }),
  );
  assert.ok(
    h.renderer.root
      .findAllByType("Text")
      .some(
        (node) =>
          node.props.children === "<script>Synthetic summary only</script>",
      ),
  );
  assert.equal(h.used.length, 0);
  await h.press("Close AI review");
  await h.press("View summary");
  assert.equal(h.requests.length, 1);
  const close = h.renderer.root.findByProps({ title: "Close AI review" });
  for (let node = close.parent; node; node = node.parent)
    assert.notEqual(node.type, "ScrollView");
  await h.close();
});

test("closing a regeneration cancels its late result and preserves the previously reviewed draft", async () => {
  const h = await harness();
  await h.press("Suggest reply");
  await act(async () =>
    h.requests[0].resolve({ draft: "Keep reviewed draft" }),
  );
  await h.press("Generate another draft");
  await h.press("Close AI review");
  assert.equal(h.requests[1].config.signal.aborted, true);
  await act(async () =>
    h.requests[1].resolve({ draft: "Ignore cancelled result" }),
  );
  await h.press("Review AI draft");
  assert.equal(
    h.renderer.root.findByProps({ accessibilityLabel: "Review AI reply" }).props
      .value,
    "Keep reviewed draft",
  );
  await h.close();
});

test("provider errors never retry automatically and capability revocation removes existing output", async () => {
  const h = await harness();
  await h.press("Suggest reply");
  await act(async () =>
    h.requests[0].reject(Error("Synthetic provider unavailable")),
  );
  assert.equal(h.requests.length, 1);
  assert.equal(h.used.length, 0);
  await h.press("Suggest reply");
  await act(async () => h.requests[1].resolve({ draft: "Private fixture" }));
  h.capabilities.data = null;
  await h.update({});
  assert.equal(
    h.renderer.root.findAllByProps({ accessibilityLabel: "Review AI reply" })
      .length,
    0,
  );
  assert.equal(h.renderer.root.findAllByType("Button").length, 0);
  await h.close();
});
