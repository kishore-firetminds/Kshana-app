const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { create, act } = require("react-test-renderer");
global.IS_REACT_ACT_ENVIRONMENT = true;
const compile = (path, mocks) => {
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
        if (name in mocks) return mocks[name];
        throw Error("Missing mock " + name);
      },
      requestAnimationFrame: (callback) => {
        callback();
        return 1;
      },
      URL,
    },
  );
  return exports;
};
const messaging = compile("src/api/messaging.ts", {});
const routing = compile("src/notificationRouting.ts", {});
const msg = (id, extra = {}) => ({
  id,
  content: id,
  createdAt: "2026-09-09T00:00:00Z",
  direction: "INCOMING",
  messageType: "TEXT",
  senderType: "contact",
  externalMessageId: "external-" + id,
  ...extra,
});
async function harness(data, params = { id: "chat" }, pages = []) {
  const scrolls = [],
    posts = [],
    gets = [];
  const resource = { data, loading: !data, refresh: async () => {} };
  const Scroll = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      scrollToEnd: (options) => scrolls.push({ end: true, ...options }),
      scrollTo: (options) => scrolls.push(options),
    }));
    return React.createElement("ScrollView", props, props.children);
  });
  const names = [
    "Alert",
    "Image",
    "Modal",
    "Platform",
    "Pressable",
    "RefreshControl",
    "Switch",
    "View",
    "Keyboard",
  ];
  const native = Object.fromEntries(names.map((name) => [name, name]));
  native.Alert = { alert: () => {} };
  native.Keyboard = { dismiss: () => {} };
  const ui = new Proxy({}, { get: () => "#123456" });
  const liveUi = Object.fromEntries(
    [
      "AccessNotice",
      "Avatar",
      "Button",
      "Feedback",
      "Field",
      "ReadOnlyNotice",
    ].map((name) => [name, name]),
  );
  const mocks = {
    react: React,
    "react-native": native,
    "./KeyboardLayout": { ScrollView: Scroll, KeyboardFrame: "KeyboardFrame" },
    "./themedText": { Text: "Text", TextInput: "TextInput" },
    "./WorkspaceScreen": {},
    "./api/workspace": {},
    "./notificationRouting": routing,
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "expo-document-picker": {},
    "expo-image-picker": {},
    "./figmaComponents": {},
    "./api": {
      api: {
        get: async (path) => {
          gets.push(path);
          return pages.shift();
        },
        post: async (path, body) => {
          posts.push({ path, body });
          return msg("sent", { direction: "OUTGOING" });
        },
      },
    },
    "./MobilePreferences": {},
    "./api/client": { errorMessage: (error) => String(error) },
    "./api/messaging": messaging,
    "./api/types": {
      can: () => true,
      canMutate: () => true,
      contactName: () => "Demo",
      humanize: (value) => value,
    },
    "./store": {
      useAppStore: (selector) => selector({ user: { id: "user" } }),
    },
    "./useResource": { useResource: () => resource },
    "./liveUi": { ...liveUi, l: {}, dateLabel: (value) => value },
    "./figmaTheme": { ui },
    "./EmojiPicker": { EmojiPicker: "EmojiPicker" },
  };
  const { FigmaConversation } = compile("src/liveScreens.tsx", mocks);
  const props = { route: { params }, navigation: { goBack: () => {} } };
  let renderer;
  await act(async () => {
    renderer = create(React.createElement(FigmaConversation, props));
  });
  return {
    renderer,
    resource,
    scrolls,
    posts,
    gets,
    update: async () =>
      act(async () =>
        renderer.update(React.createElement(FigmaConversation, props)),
      ),
    close: async () => act(async () => renderer.unmount()),
  };
}
test("initial message load stays pinned despite pre-layout scroll events; reading older messages stops auto-scroll", async () => {
  const h = await harness(null);
  let scroll = h.renderer.root.findByType("ScrollView");
  await act(async () =>
    scroll.props.onScroll({
      nativeEvent: {
        contentOffset: { y: 0 },
        contentSize: { height: 2000 },
        layoutMeasurement: { height: 500 },
      },
    }),
  );
  h.resource.data = {
    id: "chat",
    channelType: "WHATSAPP",
    messages: [msg("latest")],
  };
  await h.update();
  scroll = h.renderer.root.findByType("ScrollView");
  await act(async () => scroll.props.onContentSizeChange());
  assert.equal(h.scrolls.at(-1).end, true);
  await act(async () => {
    scroll.props.onScrollBeginDrag();
    scroll.props.onScroll({
      nativeEvent: {
        contentOffset: { y: 0 },
        contentSize: { height: 2000 },
        layoutMeasurement: { height: 500 },
      },
    });
  });
  const count = h.scrolls.length;
  await act(async () => scroll.props.onContentSizeChange());
  assert.equal(h.scrolls.length, count);
  await h.close();
});
test("an alert loads older pages and scrolls to its message instead of the bottom", async () => {
  const h = await harness(
    {
      id: "chat",
      channelType: "WHATSAPP",
      messages: [msg("latest")],
      messagesMeta: { totalPages: 2 },
    },
    { id: "chat", messageId: "old" },
    [{ items: [msg("old")], meta: { totalPages: 2 } }],
  );
  assert.equal(h.gets.length, 1);
  assert.match(h.gets[0], /page=2/);
  const target = h.renderer.root
    .findAllByType("View")
    .find((node) => node.props.onLayout && node.props.style?.borderWidth === 2);
  assert.ok(target);
  await act(async () =>
    target.props.onLayout({ nativeEvent: { layout: { y: 320 } } }),
  );
  assert.equal(h.scrolls.at(-1).y, 296);
  assert.equal(
    h.scrolls.some((value) => value.end),
    false,
  );
  await h.close();
});
test("reply keeps its message reference and reaction uses the existing API", async () => {
  const h = await harness({
    id: "chat",
    channelType: "WHATSAPP",
    messages: [msg("customer")],
  });
  await act(async () =>
    h.renderer.root
      .findByProps({ accessibilityLabel: "Reply to message" })
      .props.onPress(),
  );
  await act(async () =>
    h.renderer.root
      .findByProps({ accessibilityLabel: "Message" })
      .props.onChangeText("Thanks"),
  );
  await act(async () =>
    h.renderer.root.findByProps({ title: "Send" }).props.onPress(),
  );
  assert.equal(h.posts[0].body.replyToMessageId, "customer");
  assert.equal(h.posts[0].body.content, "Thanks");
  await act(async () =>
    h.renderer.root
      .findByProps({ accessibilityLabel: "React to message" })
      .props.onPress(),
  );
  await act(async () =>
    h.renderer.root.findByType("EmojiPicker").props.onSelect("\u{1f44d}"),
  );
  assert.match(h.posts[1].path, /messages\/customer\/reaction$/);
  assert.equal(h.posts[1].body.emoji, "\u{1f44d}");
  await h.close();
});
test("message links validate both conversation and message IDs; internal notes never send reply context", () => {
  assert.equal(
    routing.notificationMessageId("/app/inbox?conversation=c-1&message=m-2"),
    "m-2",
  );
  assert.equal(
    routing.notificationMessageId(
      "https://evil.test/app/inbox?conversation=c-1&message=m-2",
    ),
    undefined,
  );
  assert.equal(
    routing.notificationMessageId(
      "/app/inbox?conversation=c-1&message=../secret",
    ),
    undefined,
  );
  assert.equal(
    messaging.messagePayload("note", true, undefined, "m-2").replyToMessageId,
    undefined,
  );
});

test("reactions attach to their message while failures and unloaded targets remain visible", () => {
  const result = messaging.messageTimeline([
    msg("a"),
    msg("r", { reaction: { emoji: "ok", messageId: "external-a" } }),
    msg("failed", {
      status: "failed",
      reaction: { emoji: "no", messageId: "external-a" },
    }),
    msg("orphan", { reaction: { emoji: "ok", messageId: "missing" } }),
  ]);
  assert.deepEqual(
    Array.from(result.visible, (item) => item.id),
    ["a", "failed", "orphan"],
  );
  assert.deepEqual(Array.from(result.reactions.get("a")), ["ok"]);
  assert.equal(result.reactionTargets.get("r"), "a");
});
test("emoji catalog preserves web search names and complete skin-tone sequences", () => {
  const emojis = JSON.parse(fs.readFileSync("src/emojiData.json", "utf8"));
  const thumbs = emojis.find((item) => item.id === "1f44d");
  assert.ok(thumbs.keywords.includes("thumbs up"));
  assert.equal(thumbs.emoji, String.fromCodePoint(0x1f44d));
  assert.equal(thumbs.variations[4], String.fromCodePoint(0x1f44d, 0x1f3ff));
  assert.ok(emojis.length > 1800);
});
