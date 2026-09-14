import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";
import { api, API_URL } from "./api";
import type { CurrentUser } from "./api/types";
import type * as NotificationTypes from "expo-notifications";

const prefix = `kshana.mobile.${API_URL.replace(/[^A-Za-z0-9._-]/g, "_")}`;
let owner: CurrentUser | null = null;
let generation = 0;
let notifications: typeof NotificationTypes | null = null;
let permissionPrompt: Promise<void> | null = null;
let pushRegistration: Promise<void> | null = null;
let lastPushRegistration: {
  ownerKey: string;
  token: string;
  registeredAt: number;
} | null = null;

const PUSH_REGISTRATION_COOLDOWN_MS = 15 * 60 * 1000;

async function configureNotificationChannel() {
  const module = notificationModule();
  if (module && Platform.OS === "android")
    await module.setNotificationChannelAsync("workspace", {
      name: "Workspace alerts",
      importance: module.AndroidImportance.HIGH,
      lightColor: "#0e5132",
      sound: "default",
    });
}

/** Ask once per installation, including before sign-in. Never re-prompt a denial. */
export function requestInitialPushPermission(): Promise<void> {
  if (permissionPrompt) return permissionPrompt;
  permissionPrompt = (async () => {
    const module = notificationModule();
    if (!module || !Device.isDevice) return;
    await configureNotificationChannel();
    const storageKey = `${prefix}.pushPermissionAsked`;
    if (await SecureStore.getItemAsync(storageKey)) return;
    const permission = await module.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain)
      await module.requestPermissionsAsync();
    await SecureStore.setItemAsync(storageKey, "true");
  })().finally(() => {
    permissionPrompt = null;
  });
  return permissionPrompt;
}
let queue: Array<{
  id: string;
  name: string;
  screen: string;
  platform: string;
  appVersion: string;
}> = [];
let flushing: Promise<void> | null = null;
export const mobilePreferences = create<{
  analytics: boolean;
  analyticsConsentRequired: boolean;
  push: boolean;
  loaded: boolean;
}>(() => ({
  analytics: false,
  analyticsConsentRequired: false,
  push: false,
  loaded: false,
}));
const key = (name: string) => `${prefix}.${owner?.id}.${name}`;

export async function loadMobilePreferences(user: CurrentUser | null) {
  const current = ++generation;
  if (owner?.id !== user?.id || owner?.organizationId !== user?.organizationId)
    lastPushRegistration = null;
  owner = user;
  queue = [];
  mobilePreferences.setState({
    analytics: false,
    analyticsConsentRequired: false,
    push: false,
    loaded: false,
  });
  if (!user) return;
  const [analytics, push] = await Promise.all([
    SecureStore.getItemAsync(key("analytics")),
    SecureStore.getItemAsync(key("push")),
  ]);
  if (current !== generation) return;
  mobilePreferences.setState({
    analytics: analytics === "true",
    analyticsConsentRequired: analytics === null,
    push: push === "true",
    loaded: true,
  });
}
export async function setAnalyticsEnabled(enabled: boolean) {
  if (!owner) return;
  const current = generation;
  await SecureStore.setItemAsync(key("analytics"), String(enabled));
  if (current !== generation) return;
  mobilePreferences.setState({ analytics: enabled, analyticsConsentRequired: false });
  if (!enabled) queue = [];
}
export async function eraseAnalytics() {
  const current = generation;
  await setAnalyticsEnabled(false);
  await flushing;
  if (current !== generation) return;
  await api.request("/mobile/analytics", { method: "DELETE" });
}
const screens = new Set([
  "Home",
  "InboxList",
  "Conversation",
  "Campaigns",
  "Alerts",
  "Profile",
  "Templates",
  "Automations",
  "Library",
  "QuickReplies",
  "Contacts",
  "Leads",
  "Companies",
  "Tasks",
  "Analytics",
  "Team",
  "Integrations",
  "Developer",
  "Subscription",
  "Usage",
  "MetaPayments",
  "Settings",
  "Help",
  "WorkspacePage",
]);
export function trackMobileEvent(
  name: "screen_view" | "notification_open",
  screen: string,
) {
  if (!owner || !mobilePreferences.getState().analytics || !screens.has(screen))
    return;
  queue.push({
    id: Crypto.randomUUID(),
    name,
    screen,
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version || "1.0.0",
  });
  queue = queue.slice(-100);
  void flushAnalytics();
}
export function flushAnalytics(): Promise<void> {
  if (flushing) return flushing;
  if (!owner || !mobilePreferences.getState().analytics || !queue.length)
    return Promise.resolve();
  const current = generation;
  const batch = queue.slice(0, 20);
  flushing = (async () => {
    try {
      await api.post("/mobile/analytics", { events: batch });
      if (current === generation)
        queue = queue.filter(
          (event) => !batch.some((sent) => sent.id === event.id),
        );
    } catch {
      /* Bounded in-memory retry; no personal content is persisted. */
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}
export function notificationModule() {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient)
    return null;
  if (!notifications) {
    notifications = require("expo-notifications") as typeof NotificationTypes;
    notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data;
        const matches =
          !!owner &&
          data.userId === owner.id &&
          data.organizationId === owner.organizationId;
        return {
          shouldShowBanner: matches,
          shouldShowList: matches,
          shouldPlaySound: matches,
          shouldSetBadge: false,
        };
      },
    });
  }
  return notifications;
}
async function installationId() {
  const storageKey = `${prefix}.installation`;
  let id = await SecureStore.getItemAsync(storageKey);
  if (!id) {
    id = Crypto.randomUUID();
    await SecureStore.setItemAsync(storageKey, id);
  }
  return id;
}
export function registerPush(requestPermission = false) {
  if (pushRegistration) return pushRegistration;
  const pending = registerPushInternal(requestPermission).finally(() => {
    if (pushRegistration === pending) pushRegistration = null;
  });
  pushRegistration = pending;
  return pending;
}

async function registerPushInternal(requestPermission = false) {
  if (!owner) return;
  const current = generation;
  // The OS permission dialog can foreground the app before its promise settles.
  await permissionPrompt;
  if (current !== generation) return;
  const module = notificationModule();
  if (!module || !Device.isDevice) {
    if (requestPermission)
      throw new Error(
        "Push notifications need an installed development or store build on a physical device.",
      );
    return;
  }
  // A first-launch OS grant enables delivery after login. Preserve explicit opt-outs.
  if (
    !requestPermission &&
    (await SecureStore.getItemAsync(key("push"))) === "false"
  )
    return;
  const projectId =
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId)
    throw new Error("Notifications are not configured for this build yet.");
  await configureNotificationChannel();
  let permission = await module.getPermissionsAsync();
  if (!permission.granted && requestPermission)
    permission = await module.requestPermissionsAsync();
  if (!permission.granted) {
    if (requestPermission)
      throw new Error(
        "Allow notifications in your device settings to receive workspace alerts.",
      );
    await unregisterPush();
    return;
  }
  const token = (await module.getExpoPushTokenAsync({ projectId })).data;
  const id = await installationId();
  if (current !== generation) return;
  const ownerKey = `${owner.id}:${owner.organizationId}`;
  if (
    !requestPermission &&
    lastPushRegistration?.ownerKey === ownerKey &&
    lastPushRegistration.token === token &&
    Date.now() - lastPushRegistration.registeredAt < PUSH_REGISTRATION_COOLDOWN_MS
  )
    return;
  await api.request("/mobile/devices", {
    method: "PUT",
    data: { installationId: id, token, platform: Platform.OS },
  });
  if (current !== generation) return;
  lastPushRegistration = { ownerKey, token, registeredAt: Date.now() };
  await SecureStore.setItemAsync(key("push"), "true");
  mobilePreferences.setState({ push: true });
}
export async function unregisterPush(disable = true) {
  if (!owner) return;
  const current = generation;
  const storageKey = key("push");
  const id = await installationId();
  if (current !== generation) return;
  await api.request("/mobile/devices", {
    method: "DELETE",
    data: { installationId: id },
  });
  lastPushRegistration = null;
  if (disable) await SecureStore.setItemAsync(storageKey, "false");
  if (current !== generation) return;
  mobilePreferences.setState({ push: false });
  await notificationModule()?.dismissAllNotificationsAsync();
}
export function matchesNotification(
  data: Record<string, unknown>,
  user: CurrentUser | null,
) {
  return (
    !!user &&
    data.userId === user.id &&
    data.organizationId === user.organizationId &&
    typeof data.notificationId === "string"
  );
}
