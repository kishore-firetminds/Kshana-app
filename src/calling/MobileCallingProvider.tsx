import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, AppState, Vibration, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../api";
import { errorMessage } from "../api/client";
import { can, CurrentUser } from "../api/types";
import { useAppStore } from "../store";
import { Button, l } from "../liveUi";
import { Text } from "../themedText";
import { ui } from "../figmaTheme";
import { CallingState, MobileCallController } from "./controller";
import { nativeCallingAvailable, NativeAudioSession } from "./nativeAudio";

type CallingContext = {
  state: CallingState | null;
  error: string;
  loading: boolean;
  available: boolean;
  setAvailable(value: boolean): void;
  enabled: boolean;
  canHandle: boolean;
  controller: MobileCallController;
  refresh(): Promise<void>;
  run(operation: () => Promise<unknown>): Promise<void>;
};
const Context = createContext<CallingContext | null>(null);
export const useMobileCalling = () => useContext(Context);
function scope(user: CurrentUser | null) {
  return JSON.stringify([
    user?.organizationId,
    user?.id,
    user?.role,
    user?.permissions,
    user?.entitlements?.canMutate,
  ]);
}
export function MobileCallingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAppStore((s) => s.user);
  const readable =
    user &&
    !user.role.startsWith("PLATFORM_") &&
    can(user, "conversations.read.all", "conversations.read.own");
  return readable ? (
    <CallingSession key={scope(user)} user={user!}>
      {children}
    </CallingSession>
  ) : (
    <Context.Provider value={null}>{children}</Context.Provider>
  );
}
function CallingSession({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<CallingState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(false);
  const [, render] = useState(0);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const active = useRef(AppState.currentState === "active");
  const mounted = useRef(true);
  const identity = scope(user);
  const sameAccount = () => identity === scope(useAppStore.getState().user);
  const enabled = nativeCallingAvailable();
  const canHandle =
    enabled &&
    foreground &&
    can(user, "conversations.send") &&
    user.entitlements?.canMutate !== false;
  const [controller] = useState(
    () =>
      new MobileCallController(
        (path, body) => {
          if (!sameAccount())
            return Promise.reject(Error("Workspace access changed."));
          return api.post(path, body);
        },
        () => new NativeAudioSession(),
        () => {
          if (mounted.current) render((n) => n + 1);
        },
        sameAccount,
        () => active.current,
      ),
  );
  const request = useRef(false);
  async function refresh() {
    if (
      request.current ||
      !active.current ||
      !mounted.current ||
      !sameAccount()
    )
      return;
    request.current = true;
    setLoading(true);
    try {
      const next = await api.get<CallingState>("/whatsapp-calls");
      if (!mounted.current || !sameAccount() || !active.current) return;
      setState(next);
      setError("");
      await controller.tick(next);
    } catch (e) {
      if (mounted.current && sameAccount()) {
        setError(errorMessage(e));
        // Fail closed: do not retain answerable calls after a failed access check.
        setState(null);
        await controller.end().catch(() => undefined);
      }
    } finally {
      request.current = false;
      if (mounted.current) setLoading(false);
    }
  }
  async function run(operation: () => Promise<unknown>) {
    if (!mounted.current || !sameAccount() || !active.current) return;
    setError("");
    try {
      await operation();
    } catch (e) {
      if (mounted.current && sameAccount()) setError(errorMessage(e));
    } finally {
      await refresh();
    }
  }
  useEffect(() => {
    mounted.current = true;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      await refresh();
      if (!stopped) timer = setTimeout(poll, controller.activeId ? 2000 : 5000);
    }
    void poll();
    const subscription = AppState.addEventListener("change", (value) => {
      active.current = value === "active";
      setForeground(active.current);
      if (!active.current) {
        setState(null);
        // Background audio must wait for CallKit/Telecom and signed VoIP push.
        void controller.end().catch(() => undefined);
      } else void refresh();
    });
    return () => {
      stopped = true;
      mounted.current = false;
      clearTimeout(timer);
      subscription.remove();
      controller.dispose();
    };
  }, [controller]);
  const incoming =
    foreground && available && canHandle && !controller.activeId
      ? state?.calls.find(
          (c) =>
            c.status === "RINGING" &&
            c.direction !== "OUTBOUND" &&
            !c.simulated,
        )
      : null;
  const current = foreground && controller.activeId;
  useEffect(() => {
    if (incoming?.id) Vibration.vibrate([0, 350, 650], true);
    return () => Vibration.cancel();
  }, [incoming?.id]);
  const value = {
    state,
    error,
    loading,
    available,
    setAvailable,
    enabled,
    canHandle,
    controller,
    refresh,
    run,
  };
  return (
    <Context.Provider value={value}>
      {children}
      {(incoming || current) && (
        <View
          accessibilityLiveRegion="polite"
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: Math.max(insets.bottom, 12),
            backgroundColor: ui.white,
            borderWidth: 1,
            borderColor: ui.primary,
            borderRadius: 16,
            padding: 16,
            gap: 10,
            elevation: 10,
          }}
        >
          <Text style={l.heading}>
            {incoming
              ? `Incoming WhatsApp call: ${incoming.callerName || "Customer"}`
              : "WhatsApp call in progress"}
          </Text>
          <Text style={l.muted}>
            Recording off · Keep this app in the foreground
          </Text>
          {incoming ? (
            <>
              <Button
                title="Answer"
                disabled={controller.busy}
                onPress={() =>
                  void run(() => controller.answer(incoming, state!))
                }
              />
              <Button
                title="Decline for team"
                secondary
                disabled={controller.busy}
                onPress={() =>
                  Alert.alert(
                    "Decline this call?",
                    "This declines the call for your entire team.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Decline",
                        style: "destructive",
                        onPress: () =>
                          void run(() =>
                            api.post(
                              `/whatsapp-calls/${encodeURIComponent(incoming.id)}/actions`,
                              { action: "reject" },
                            ),
                          ),
                      },
                    ],
                  )
                }
              />
            </>
          ) : (
            <>
              <Button
                title={
                  controller.muted ? "Unmute microphone" : "Mute microphone"
                }
                secondary
                disabled={controller.busy}
                onPress={() => controller.toggleMute()}
              />
              <Button
                title="End call"
                onPress={() => void run(() => controller.end())}
              />
            </>
          )}
          {error ? <Text style={l.error}>{error}</Text> : null}
        </View>
      )}
    </Context.Provider>
  );
}
