import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ui } from "./figmaTheme";
import { Text } from "./themedText";
import { workspaceScript } from "./api/workspaceExport";
import { shareWorkspaceExport } from "./workspaceFiles";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Pressable,
  View,
} from "react-native";
import {
  DrawerActions,
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from "@react-navigation/native";
import { WebView } from "react-native-webview";
import { api, SITE_URL } from "./api";
import { workspaceReadinessScript, workspaceUrl } from "./api/workspace";
import {
  isMobilePurchaseUrl,
  mobilePurchaseGuardScript,
} from "./api/mobilePurchases";
import { BrandHeader } from "./figmaComponents";
import { Button, l } from "./liveUi";
import { KeyboardFrame } from "./KeyboardLayout";
import { workspaceViewportScript } from "./api/workspaceViewport";

export function WorkspacePage({ route }: any) {
  return (
    <WorkspaceScreen path={route.params.path} title={route.params.title} />
  );
}
export function WorkspaceScreen({
  path,
  title,
}: {
  path: string;
  title: string;
}) {
  const focused = useIsFocused();
  return focused ? (
    <WorkspaceContent key={path} path={path} title={title} />
  ) : (
    <View style={l.page} />
  );
}
function WorkspaceContent({ path, title }: { path: string; title: string }) {
  const navigation = useNavigation<any>();
  const web = useRef<WebView>(null);
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [back, setBack] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const preparing = useRef(false);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const target = useMemo(() => workspaceUrl(SITE_URL, path), [path]);
  const source = useMemo(() => ({ uri: target }), [target]);
  const origin = new URL(SITE_URL).origin;
  const retry = () => {
    setReady(false);
    setError("");
    setBack(false);
    setPrepared(false);
    preparing.current = false;
    generation.current++;
    setAttempt((x) => x + 1);
  };
  useEffect(() => {
    if (ready || error) return;
    const timeout = setTimeout(
      () =>
        setError(
          "The workspace took too long to load. Check your connection and retry.",
        ),
      45000,
    );
    return () => clearTimeout(timeout);
  }, [ready, error, attempt]);
  useEffect(() => {
    if (prepared || error || preparing.current) return;
    preparing.current = true;
    const current = generation.current;
    void api
      .prepareWorkspace(SITE_URL)
      .then(() => {
        if (current === generation.current) setPrepared(true);
      })
      .catch(() => {
        if (current === generation.current)
          setError(
            "Could not open your workspace session. Please retry or sign in again.",
          );
      });
  }, [attempt, error, prepared]);
  useFocusEffect(
    useCallback(() => {
      const handler = BackHandler.addEventListener("hardwareBackPress", () => {
        if (back) {
          web.current?.goBack();
          return true;
        }
        return false;
      });
      return () => handler.remove();
    }, [back]),
  );
  const menu = () => {
    let current = navigation;
    while (current) {
      if (current.openDrawer) {
        current.openDrawer();
        return;
      }
      current = current.getParent?.();
    }
    const app = navigation
      .getState()
      .routes.find((route: any) => route.name === "App");
    navigation.navigate("App");
    if (app?.state?.key)
      navigation.dispatch({
        ...DrawerActions.openDrawer(),
        target: app.state.key,
      });
  };
  return (
    <View style={l.page}>
      <BrandHeader
        onAvatar={menu}
        onSearch={false}
        actions={
          <View style={{ flexDirection: "row" }}>
            {(back || navigation.canGoBack()) && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() =>
                  back ? web.current?.goBack() : navigation.goBack()
                }
                style={{
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={23}
                  color={ui.primary}
                />
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reload page"
              onPress={retry}
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={23}
                color={ui.primary}
              />
            </Pressable>
          </View>
        }
      />
      <KeyboardFrame>
        {!error && prepared && (
          <WebView
            key={attempt}
            ref={web}
            source={source}
            style={{ flex: 1, opacity: ready ? 1 : 0 }}
            incognito
            sharedCookiesEnabled
            cacheEnabled={false}
            javaScriptEnabled
            domStorageEnabled
            nestedScrollEnabled
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
            webviewDebuggingEnabled={__DEV__}
            injectedJavaScriptBeforeContentLoaded={
              workspaceViewportScript(origin) +
              "\n" +
              mobilePurchaseGuardScript(origin) +
              "\n" +
              workspaceScript(origin) +
              "\n" +
              workspaceReadinessScript(origin)
            }
            injectedJavaScript={
              workspaceViewportScript(origin) +
              "\n" +
              mobilePurchaseGuardScript(origin) +
              "\n" +
              workspaceScript(origin) +
              "\n" +
              workspaceReadinessScript(origin)
            }
            onMessage={(event) => {
              try {
                const url = new URL(event.nativeEvent.url);
                // Android supplies the sender origin here, without its path.
                if (url.origin !== origin) return;
                const message = JSON.parse(event.nativeEvent.data);
                if (
                  message.type === "kshana-workspace-state" &&
                  typeof message.ready === "boolean"
                ) {
                  setReady(message.ready);
                  return;
                }
                void shareWorkspaceExport(event.nativeEvent.data).catch(
                  (error) => Alert.alert("Export unavailable", error.message),
                );
              } catch (_) {}
            }}
            originWhitelist={["https://*"]}
            mixedContentMode="never"
            onShouldStartLoadWithRequest={(request) => {
              if (isMobilePurchaseUrl(request.url, origin)) return false;
              try {
                const url = new URL(request.url);
                if (url.origin === origin) {
                  if (url.pathname === "/login") {
                    setError(
                      "Your workspace session ended. Please sign in again.",
                    );
                    if (ready) void api.clear();
                    return false;
                  }
                  return true;
                }
                if (request.isTopFrame === false) return true;
                if (
                  ready &&
                  ["https:", "mailto:", "tel:"].includes(url.protocol)
                )
                  void Linking.openURL(url.href).catch(() =>
                    setError("Could not open this link."),
                  );
              } catch (_) {}
              return false;
            }}
            onNavigationStateChange={(state) => {
              setBack(
                state.canGoBack &&
                  state.url !== target,
              );
            }}
            onError={() =>
              setError(
                "Unable to load the workspace. Check your connection and retry.",
              )
            }
            onHttpError={(event) => {
              if (
                event.nativeEvent.url === target ||
                event.nativeEvent.statusCode >= 500
              )
                setError(
                  `The workspace server returned ${event.nativeEvent.statusCode}. Please retry.`,
                );
            }}
            onRenderProcessGone={retry}
            onContentProcessDidTerminate={retry}
            onOpenWindow={(event) => {
              if (isMobilePurchaseUrl(event.nativeEvent.targetUrl, origin))
                return;
              try {
                const url = new URL(event.nativeEvent.targetUrl);
                if (url.origin === origin)
                  navigation.navigate("WorkspacePage", {
                    path: workspaceUrl(SITE_URL, url.pathname + url.search),
                    title,
                  });
                else if (url.protocol === "https:")
                  void Linking.openURL(url.href).catch(() =>
                    Alert.alert(
                      "Link unavailable",
                      "Could not open this link.",
                    ),
                  );
              } catch (_) {}
            }}
          />
        )}
        {(!ready || error) && (
          <View
            style={{
              position: "absolute",
              inset: 0,
              justifyContent: "center",
              padding: 24,
              backgroundColor: ui.bg,
              gap: 16,
            }}
          >
            {error ? (
              <>
                <Text style={l.body}>{error}</Text>
                <Button title="Try again" onPress={retry} />
              </>
            ) : (
              <>
                <ActivityIndicator color={ui.primary} />
                <Text style={[l.body, { textAlign: "center" }]}>
                  Loading workspace...
                </Text>
              </>
            )}
          </View>
        )}
      </KeyboardFrame>
    </View>
  );
}
