import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useAppStore } from "./store";
import {
  flushAnalytics,
  loadMobilePreferences,
  matchesNotification,
  notificationModule,
  registerPush,
  requestInitialPushPermission,
} from "./mobileServices";

export function MobileLifecycle({
  onOpenNotification,
  navigationReady,
}: {
  onOpenNotification: (data: Record<string, unknown>) => Promise<boolean>;
  navigationReady: boolean;
}) {
  const user = useAppStore((s) => s.user);
  const handledResponse = useRef("");
  useEffect(() => {
    let disposed = false;
    void loadMobilePreferences(user)
      .then(() => requestInitialPushPermission())
      .then(() => {
        if (!disposed && user) return registerPush();
      })
      .catch(() => {});
    return () => {
      disposed = true;
    };
  }, [user?.id, user?.organizationId]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void registerPush().catch(() => {});
      void flushAnalytics();
    });
    const interval = setInterval(() => void flushAnalytics(), 15000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    if (!navigationReady) return;
    const module = notificationModule();
    if (!module) return;
    const handle = async (
      response: import("expo-notifications").NotificationResponse,
    ) => {
      const current = useAppStore.getState().user;
      const responseKey = `${current?.id}:${response.notification.request.identifier}`;
      if (handledResponse.current === responseKey) return;
      if (
        !matchesNotification(
          response.notification.request.content.data,
          current,
        )
      )
        return;
      handledResponse.current = responseKey;
      if (
        await onOpenNotification(response.notification.request.content.data)
      ) {
        void module.clearLastNotificationResponseAsync().catch(() => {});
      } else handledResponse.current = "";
    };
    const taps = module.addNotificationResponseReceivedListener(handle);
    const tokens = module.addPushTokenListener(
      () => void registerPush().catch(() => {}),
    );
    void module
      .getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handle(response);
      })
      .catch(() => {});
    return () => {
      taps.remove();
      tokens.remove();
    };
  }, [onOpenNotification, user?.id, navigationReady]);
  return null;
}
