const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { randomUUID } = require("node:crypto");

function harness(post = async () => {}, native = false, allowPermission = true) {
  const storage = new Map();
  const calls = [];
  let granted = false;
  let prompts = 0;
  const api = {
    post: async (path, body) => {
      calls.push({ path, body });
      return post();
    },
    request: async (path, config) => {
      calls.push({ path, config });
    },
  };
  const mocks = {
    "expo-constants": {
      executionEnvironment: native ? "standalone" : "storeClient",
      easConfig: { projectId: "test-project" },
      expoConfig: { version: "1.0.0" },
      ExecutionEnvironment: { StoreClient: "storeClient" },
    },
    "expo-device": { isDevice: native },
    "expo-notifications": {
      setNotificationHandler: () => {},
      AndroidImportance: { HIGH: 4 },
      setNotificationChannelAsync: async () => {},
      getPermissionsAsync: async () => ({ granted, canAskAgain: true }),
      requestPermissionsAsync: async () => {
        prompts++;
        granted = allowPermission;
        return { granted };
      },
      getExpoPushTokenAsync: async () => ({ data: "ExpoPushToken[test]" }),
      dismissAllNotificationsAsync: async () => {},
    },
    "expo-crypto": { randomUUID },
    "expo-secure-store": {
      getItemAsync: async (key) => storage.get(key),
      setItemAsync: async (key, value) => storage.set(key, value),
    },
    "react-native": { Platform: { OS: "android" } },
    zustand: {
      create: (init) => {
        let state = init();
        const hook = () => state;
        hook.getState = () => state;
        hook.setState = (value) => {
          state = { ...state, ...value };
        };
        return hook;
      },
    },
    "./api": { api, API_URL: "https://example.test/api/backend" },
  };
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync("src/mobileServices.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      if (!(name in mocks)) throw Error(`Unexpected native import ${name}`);
      return mocks[name];
    },
  });
  return { service: exports, calls, promptCount: () => prompts };
}
const user = { id: "user-a", organizationId: "org-a" };
test("mobile analytics is opt-in and rejects arbitrary screen content", async () => {
  const { service: s, calls } = harness();
  await s.loadMobilePreferences(user);
  s.trackMobileEvent("screen_view", "Home");
  assert.equal(calls.length, 0);
  await s.setAnalyticsEnabled(true);
  s.trackMobileEvent("screen_view", "customer@example.com");
  assert.equal(calls.length, 0);
  s.trackMobileEvent("screen_view", "Home");
  await s.flushAnalytics();
  assert.equal(calls.length, 1);
  assert.deepEqual(Object.keys(calls[0].body.events[0]).sort(), [
    "appVersion",
    "id",
    "name",
    "platform",
    "screen",
  ]);
});
test("switching accounts does not transfer consent or queued analytics", async () => {
  const { service: s, calls } = harness();
  await s.loadMobilePreferences(user);
  await s.setAnalyticsEnabled(true);
  await s.loadMobilePreferences({ id: "user-b", organizationId: "org-b" });
  s.trackMobileEvent("screen_view", "Home");
  assert.equal(calls.length, 0);
  assert.equal(s.mobilePreferences.getState().analytics, false);
});
test("analytics deletion waits for an in-flight upload before erasing", async () => {
  let finish;
  const { service: s, calls } = harness(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await s.loadMobilePreferences(user);
  await s.setAnalyticsEnabled(true);
  s.trackMobileEvent("screen_view", "Home");
  const deleting = s.eraseAnalytics();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 1);
  finish();
  await deleting;
  assert.equal(calls[1].config.method, "DELETE");
  assert.equal(s.mobilePreferences.getState().analytics, false);
});
test("notification taps are restricted to the current account and workspace", () => {
  const { service: s } = harness();
  assert.equal(
    s.matchesNotification(
      { userId: "user-a", organizationId: "org-a", notificationId: "alert" },
      user,
    ),
    true,
  );
  assert.equal(
    s.matchesNotification(
      { userId: "user-a", organizationId: "org-b", notificationId: "alert" },
      user,
    ),
    false,
  );
  assert.equal(
    s.matchesNotification(
      { userId: "user-b", organizationId: "org-a", notificationId: "alert" },
      user,
    ),
    false,
  );
  assert.equal(s.matchesNotification({}, null), false);
});
test("Expo Go never imports unsupported remote-push native code", async () => {
  const { service: s } = harness();
  await s.loadMobilePreferences(user);
  assert.equal(s.notificationModule(), null);
  await assert.rejects(s.registerPush(true), /physical device/);
});

test("first launch asks once before login and registers after login without another prompt", async () => {
  const { service: s, calls, promptCount } = harness(undefined, true);
  await Promise.all([
    s.requestInitialPushPermission(),
    s.requestInitialPushPermission(),
  ]);
  await s.requestInitialPushPermission();
  assert.equal(promptCount(), 1);
  assert.equal(calls.length, 0);
  await s.loadMobilePreferences(user);
  await s.registerPush();
  assert.equal(calls[0].config.method, "PUT");
  assert.equal(s.mobilePreferences.getState().push, true);
});

test("automatic registration preserves explicit opt-out but logout does not disable next login", async () => {
  const { service: s, calls } = harness(undefined, true);
  await s.requestInitialPushPermission();
  await s.loadMobilePreferences(user);
  await s.registerPush();
  await s.unregisterPush(false);
  await s.loadMobilePreferences(user);
  await s.registerPush();
  assert.equal(calls.at(-1).config.method, "PUT");
  await s.unregisterPush();
  const count = calls.length;
  await s.registerPush();
  assert.equal(calls.length, count);
});

test("denying first-launch permission never registers a push token or repeatedly prompts", async () => {
  const { service: s, calls, promptCount } = harness(undefined, true, false);
  await s.requestInitialPushPermission();
  await s.loadMobilePreferences(user);
  await s.registerPush();
  await s.requestInitialPushPermission();
  await s.registerPush();
  assert.equal(promptCount(), 1);
  assert.equal(calls.some(call => call.config?.method === "PUT"), false);
});

test("message routing accepts inbox links and rejects external and malformed destinations", () => {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync("src/notificationRouting.ts", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports, URL },
  );
  const route = exports.notificationConversationId;
  assert.equal(route("/app/inbox?conversation=abc-123&message=msg"), "abc-123");
  assert.equal(route("https://evil.test/app/inbox?conversation=abc"), null);
  assert.equal(route("/app/inbox?conversation=../../other"), null);
  assert.equal(route("/app/leads?id=123"), null);
});
