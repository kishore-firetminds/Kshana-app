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
      setTimeout,
      clearTimeout,
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
async function harness(
  data,
  params = { id: "chat" },
  pages = [],
  options = {},
) {
  const scrolls = [],
    posts = [],
    gets = [];
  const resource = {
    data: data ? { lastInboundAt: new Date().toISOString(), ...data } : data,
    loading: !data,
    refresh: async () => {},
  };
  const resourceCalls = [];
  const alerts = [];
  const templateResource = {
    data: options.templates || [],
    loading: false,
    refresh: async () => {},
  };
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
  native.Alert = { alert: (...args) => alerts.push(args) };
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
    "./figmaComponents": {
      BrandHeader: "BrandHeader",
      Pill: "Pill",
      SearchBox: "SearchBox",
    },
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
        request: async (path, config) => {
          posts.push({ path, body: config.data, headers: config.headers });
          if (options.failTemplate) throw Error("Synthetic template failure");
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
    "./access": { canAccessTab: () => true },
    "./mobileServices": { syncNotificationBadge: async () => {} },
    "./store": {
      useAppStore: (selector) => selector({ user: { id: "user" } }),
    },
    "./useResource": {
      useResource: (...args) => {
        resourceCalls.push(args);
        if (options.component === "Inbox" && !args[0])
          return { data: null, loading: false, refresh: async () => {} };
        if (args[0]?.startsWith("/contacts?"))
          return {
            data: { items: options.contacts || [], meta: { totalPages: 1 } },
            loading: false,
            refresh: async () => {},
          };
        return args[0] === "/whatsapp-templates" ? templateResource : resource;
      },
    },
    "./liveUi": { ...liveUi, l: {}, dateLabel: (value) => value },
    "./figmaTheme": { ui },
    "./EmojiPicker": { EmojiPicker: "EmojiPicker" },
    "./WhatsappNumberAccess": { MemberNumberSelector: "MemberNumberSelector" },
    "./MobileAiAssistance": { MobileAiAssistance: "MobileAiAssistance" },
    "./calling/MobileCallOptions": { MobileCallOptions: "MobileCallOptions" },
  };
  const { FigmaConversation, FigmaInbox } = compile(
    "src/liveScreens.tsx",
    mocks,
  );
  const Screen = options.component === "Inbox" ? FigmaInbox : FigmaConversation;
  const navigations = [];
  const props = {
    route: { params },
    navigation: {
      goBack: () => {},
      navigate: (...args) => navigations.push(args),
    },
  };
  let renderer;
  await act(async () => {
    renderer = create(React.createElement(Screen, props));
  });
  return {
    renderer,
    resource,
    resourceCalls,
    scrolls,
    posts,
    gets,
    navigations,
    alerts,
    update: async () =>
      act(async () => renderer.update(React.createElement(Screen, props))),
    close: async () => act(async () => renderer.unmount()),
  };
}
test("native inbox waits for an assigned sender and pins new conversations to that number", async () => {
  const h = await harness(
    { items: [], meta: { totalPages: 1 } },
    undefined,
    [],
    {
      component: "Inbox",
      contacts: [{ id: "qa-contact", whatsappNumber: "+15550000001" }],
    },
  );
  assert.equal(
    h.renderer.root.findByProps({ title: "New chat" }).props.disabled,
    true,
  );
  assert.ok(
    !h.resourceCalls.some((args) => args[0]?.startsWith("/conversations?")),
  );
  await act(async () =>
    h.renderer.root
      .findByType("MemberNumberSelector")
      .props.onChanged("sender-qa"),
  );
  assert.equal(
    h.renderer.root.findByProps({ title: "New chat" }).props.disabled,
    false,
  );
  assert.ok(
    h.resourceCalls.some(
      (args) =>
        args[0]?.startsWith("/conversations?") && args[3] === "sender-qa",
    ),
  );
  await act(async () =>
    h.renderer.root.findByProps({ title: "New chat" }).props.onPress(),
  );
  const contact = h.renderer.root
    .findAllByType("Pressable")
    .find((node) =>
      node.findAllByType("Text").some((text) => text.props.children === "Demo"),
    );
  await act(async () => contact.props.onPress());
  assert.equal(h.posts.length, 1);
  assert.equal(h.posts[0].path, "/conversations");
  assert.equal(h.posts[0].headers["x-whatsapp-phone-number-id"], "sender-qa");
  assert.equal(h.posts[0].body.whatsappPhoneNumberId, "sender-qa");
  await act(async () =>
    h.renderer.root.findByType("MemberNumberSelector").props.onChanged(null),
  );
  assert.equal(
    h.renderer.root.findByProps({ title: "New chat" }).props.disabled,
    true,
  );
  await h.close();
});

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

test("revoked conversation access hides cached history and disables sending", async () => {
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
  await act(async () =>
    h.renderer.root
      .findByType("TextInput")
      .props.onChangeText("Private unsent fixture"),
  );
  h.resource.data = null;
  h.resource.loading = false;
  h.resource.error = "Conversation not found";
  await h.update();
  const textNodes = h.renderer.root.findAllByType("Text");
  assert.equal(
    textNodes.some((node) => node.props.children === "old"),
    false,
  );
  assert.equal(
    textNodes.some((node) => node.props.children === "latest"),
    false,
  );
  assert.equal(
    h.renderer.root.findByProps({ title: "Send" }).props.disabled,
    true,
  );
  assert.equal(h.renderer.root.findByType("TextInput").props.value, "");
  await h.close();
});

test("using an AI draft only fills the composer until a human explicitly sends", async () => {
  const h = await harness({
    id: "chat",
    channelType: "WHATSAPP",
    messages: [],
  });
  await act(async () =>
    h.renderer.root
      .findByType("MobileAiAssistance")
      .props.onUse("Reviewed synthetic reply"),
  );
  assert.equal(
    h.renderer.root.findByType("TextInput").props.value,
    "Reviewed synthetic reply",
  );
  assert.equal(h.posts.length, 0);
  await act(async () =>
    h.renderer.root.findByProps({ title: "Send" }).props.onPress(),
  );
  assert.equal(h.posts.length, 1);
  assert.equal(h.posts[0].body.content, "Reviewed synthetic reply");
  await h.close();
});

test("AI replacement requires confirmation and stale confirmations cannot overwrite newer typing", async () => {
  const h = await harness({
    id: "chat",
    channelType: "WHATSAPP",
    messages: [],
  });
  await act(async () =>
    h.renderer.root
      .findByType("TextInput")
      .props.onChangeText("My original draft"),
  );
  await act(async () =>
    h.renderer.root
      .findByType("MobileAiAssistance")
      .props.onUse("AI suggestion"),
  );
  assert.equal(
    h.renderer.root.findByType("TextInput").props.value,
    "My original draft",
  );
  const confirm = h.alerts
    .at(-1)[2]
    .find((action) => action.text === "Replace message");
  await act(async () =>
    h.renderer.root
      .findByType("TextInput")
      .props.onChangeText("My newer draft"),
  );
  await act(async () => confirm.onPress());
  assert.equal(
    h.renderer.root.findByType("TextInput").props.value,
    "My newer draft",
  );
  assert.equal(h.posts.length, 0);
  await act(async () =>
    h.renderer.root
      .findByType("MobileAiAssistance")
      .props.onUse("Reviewed replacement"),
  );
  await act(async () =>
    h.alerts
      .at(-1)[2]
      .find((action) => action.text === "Replace message")
      .onPress(),
  );
  assert.equal(
    h.renderer.root.findByType("TextInput").props.value,
    "Reviewed replacement",
  );
  assert.equal(h.posts.length, 0);
  await h.close();
});

test("expired WhatsApp window blocks text while templates and internal notes remain available", async () => {
  const h = await harness({
    id: "chat",
    channelType: "WHATSAPP",
    lastInboundAt: new Date(Date.now() - 86400001).toISOString(),
    messages: [],
  });
  assert.equal(
    h.renderer.root.findByProps({ title: "Send" }).props.disabled,
    true,
  );
  assert.equal(
    h.renderer.root.findByProps({ title: "Send approved template" }).props
      .disabled,
    false,
  );
  await act(async () =>
    h.renderer.root.findByType("Switch").props.onValueChange(true),
  );
  await act(async () =>
    h.renderer.root
      .findByType("TextInput")
      .props.onChangeText("QA internal note"),
  );
  assert.equal(
    h.renderer.root.findByProps({ title: "Add note" }).props.disabled,
    false,
  );
  await act(async () =>
    h.renderer.root.findByProps({ title: "Add note" }).props.onPress(),
  );
  assert.equal(h.posts[0].path, "/conversations/chat/internal-note");
  await h.close();
});

test("native templates use their dedicated endpoint and original conversation sender", async () => {
  const h = await harness(
    {
      id: "chat",
      channelType: "WHATSAPP",
      whatsappPhoneNumberId: "sender-original",
      messages: [],
    },
    undefined,
    [],
    {
      templates: [
        {
          id: "approved",
          name: "QA template",
          status: "ACTIVE",
          bodyText: "Hello {{1}}",
        },
      ],
    },
  );
  await act(async () =>
    h.renderer.root
      .findByProps({ title: "Send approved template" })
      .props.onPress(),
  );
  for (
    let node = h.renderer.root.findByProps({ title: "Close" }).parent;
    node;
    node = node.parent
  )
    assert.notEqual(node.type, "ScrollView");
  assert.ok(
    h.resourceCalls.some(
      (args) =>
        args[0] === "/whatsapp-templates" && args[3] === "sender-original",
    ),
  );
  const option = h.renderer.root
    .findAllByType("Pressable")
    .find((node) =>
      node
        .findAllByType("Text")
        .some((text) => text.props.children === "QA template"),
    );
  await act(async () => option.props.onPress());
  assert.equal(
    h.renderer.root.findByProps({ title: "Send template" }).props.disabled,
    true,
  );
  await act(async () =>
    h.renderer.root
      .findByProps({ label: "Parameter 1" })
      .props.onChangeText("QA only"),
  );
  await act(async () =>
    h.renderer.root.findByProps({ title: "Send template" }).props.onPress(),
  );
  assert.equal(h.posts.length, 1);
  assert.equal(h.posts[0].path, "/whatsapp-templates/approved/send");
  assert.deepEqual(JSON.parse(JSON.stringify(h.posts[0].body)), {
    conversationId: "chat",
    parameters: ["QA only"],
  });
  assert.equal(
    h.posts[0].headers["x-whatsapp-phone-number-id"],
    "sender-original",
  );
  await h.close();
});

test("failed template preserves entered parameters and never automatically resends", async () => {
  const h = await harness(
    { id: "chat", channelType: "WHATSAPP", messages: [] },
    undefined,
    [],
    {
      templates: [
        {
          id: "approved",
          name: "QA template",
          status: "ACTIVE",
          bodyText: "Hello {{1}}",
        },
      ],
      failTemplate: true,
    },
  );
  await act(async () =>
    h.renderer.root
      .findByProps({ title: "Send approved template" })
      .props.onPress(),
  );
  const option = h.renderer.root
    .findAllByType("Pressable")
    .find((node) =>
      node
        .findAllByType("Text")
        .some((text) => text.props.children === "QA template"),
    );
  await act(async () => option.props.onPress());
  await act(async () =>
    h.renderer.root
      .findByProps({ label: "Parameter 1" })
      .props.onChangeText("Keep draft"),
  );
  await act(async () =>
    h.renderer.root.findByProps({ title: "Send template" }).props.onPress(),
  );
  assert.equal(h.posts.length, 1);
  assert.equal(
    h.renderer.root.findByProps({ label: "Parameter 1" }).props.value,
    "Keep draft",
  );
  await h.update();
  assert.equal(h.posts.length, 1);
  h.resource.data = null;
  await h.update();
  assert.equal(
    h.renderer.root.findAllByProps({ title: "Send template" }).length,
    0,
  );
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
