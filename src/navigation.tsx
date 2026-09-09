import { BottomNavigation } from "./BottomNavigation";
import { Text } from "./themedText";
import { WorkspacePage } from "./WorkspaceScreen";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { MobileLifecycle } from "./MobileLifecycle";
import { trackMobileEvent } from "./mobileServices";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import {
  BarChart3,
  Bell,
  CircleHelp,
  FileText,
  Home,
  Inbox,
  LayoutGrid,
  LogOut,
  Send,
  Settings,
  Users,
  WalletCards,
  Zap,
  UserRound,
} from "lucide-react-native";
import {
  DrawerParamList,
  InboxStackParamList,
  RootStackParamList,
  TabParamList,
} from "./types";
import {
  FigmaAlerts,
  FigmaCampaigns,
  FigmaConversation,
  FigmaHome,
  FigmaInbox,
  FigmaLogin,
  FigmaProfile,
} from "./figmaScreens";
import { BrandHeader, Page, Surface } from "./figmaComponents";
import { ui } from "./figmaTheme";
import { useAppStore } from "./store";
import { ModuleScreen, moduleConfig } from "./moduleScreens";
import { can } from "./api/types";
import { Avatar, Button, Feedback, l } from "./liveUi";
import { api } from "./api";
import type { Notification } from "./api/types";
import { matchesNotification } from "./mobileServices";
import {
  notificationConversationId,
  notificationMessageId,
} from "./notificationRouting";

const Root = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();
const InboxStack = createNativeStackNavigator<InboxStackParamList>();
const navigationRef = createNavigationContainerRef<any>();
async function openPushNotification(data: Record<string, unknown>) {
  if (!navigationRef.isReady() || !useAppStore.getState().authenticated)
    return false;
  const user = useAppStore.getState().user;
  if (!matchesNotification(data, user)) return false;
  let notification: Notification | null = null;
  try {
    notification = await api.get<Notification>(
      `/notifications/${encodeURIComponent(String(data.notificationId))}`,
    );
  } catch {
    /* Older servers or unavailable alerts safely fall back to Alerts. */
  }
  if (useAppStore.getState().user !== user || !navigationRef.isReady())
    return false;
  const conversationId = notificationConversationId(notification?.link);
  navigationRef.navigate("App", {
    screen: "Main",
    params: conversationId
      ? {
          screen: "Inbox",
          params: {
            screen: "Conversation",
            params: {
              id: conversationId,
              messageId: notificationMessageId(notification?.link),
            },
          },
        }
      : { screen: "Alerts" },
  });
  trackMobileEvent(
    "notification_open",
    conversationId ? "Conversation" : "Alerts",
  );
  return true;
}
let lastScreen = "";
function trackScreen() {
  const screen = navigationRef.getCurrentRoute()?.name || "";
  if (screen !== lastScreen) {
    lastScreen = screen;
    trackMobileEvent("screen_view", screen);
  }
}
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: ui.bg,
    primary: ui.primary,
    text: ui.ink,
    border: ui.line,
    card: ui.white,
  },
};

function InboxNav() {
  return (
    <InboxStack.Navigator
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
      <InboxStack.Screen name="InboxList" component={FigmaInbox} />
      <InboxStack.Screen
        name="Conversation"
        component={FigmaConversation}
        options={{ gestureEnabled: false }}
      />
    </InboxStack.Navigator>
  );
}
function MainTabs() {
  return (
    <Tabs.Navigator
      tabBar={(props) => <BottomNavigation {...props} />}
      screenOptions={{
        headerShown: false,
        animation: "fade",
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="Home" component={FigmaHome} />
      <Tabs.Screen name="Inbox" component={InboxNav} />
      <Tabs.Screen name="Campaigns" component={FigmaCampaigns} />
      <Tabs.Screen name="Alerts" component={FigmaAlerts} />
      <Tabs.Screen name="Profile" component={FigmaProfile} />
    </Tabs.Navigator>
  );
}

const groups = [
  [
    "MESSAGING",
    [
      ["Templates", "Message Templates", FileText],
      ["Automations", "Automations", Zap],
      ["Library", "Template Library", FileText],
      ["QuickReplies", "Quick Replies", Send],
    ],
  ],
  [
    "CONTACTS & FOLLOW-UPS",
    [
      ["Contacts", "Contacts", Users],
      ["Leads", "Leads", UserRound],
      ["Companies", "Businesses", LayoutGrid],
      ["Tasks", "Follow-ups", Bell],
    ],
  ],
  [
    "MANAGEMENT",
    [
      ["Analytics", "Analytics", BarChart3],
      ["Team", "Team Management", Users],
      ["Integrations", "Integrations", LayoutGrid],
      ["Developer", "Developers", LayoutGrid],
    ],
  ],
  [
    "ACCOUNT",
    [
      ["Settings", "Settings", Settings],
      ["Help", "Help & Support", CircleHelp],
    ],
  ],
] as const;
function AppDrawer(p: DrawerContentComponentProps) {
  const logout = useAppStore((x) => x.logout);
  const user = useAppStore((x) => x.user);
  const workspace = useAppStore((x) => x.workspace);
  return (
    <View style={n.drawer}>
      <BrandHeader
        onSearch={false}
        onAvatar={() => p.navigation.closeDrawer()}
      />
      <ScrollView contentContainerStyle={n.drawerBody}>
        <View style={n.workspace}>
          <Avatar name={workspace || "Workspace"} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={n.workspaceTitle}>
              {workspace}
            </Text>
            <Text numberOfLines={1} style={n.workspaceSub}>
              {user?.fullName}
            </Text>
          </View>
        </View>
        <Pressable
          style={p.state.index === 0 ? n.activeItem : n.drawerItem}
          onPress={() => p.navigation.navigate("Main", { screen: "Home" })}
        >
          <Home color={ui.primary} size={20} />
          <Text style={n.activeText}>Dashboard</Text>
        </Pressable>
        {groups.map(([group, items]) => (
          <View key={group}>
            <Text style={n.group}>{group}</Text>
            {items
              .filter(
                ([key]) =>
                  !moduleConfig[key].permission ||
                  can(user, moduleConfig[key].permission!),
              )
              .map(([key, label, Icon]) => (
                <Pressable
                  key={key}
                  style={
                    p.state.routes[p.state.index].name === key
                      ? n.activeItem
                      : n.drawerItem
                  }
                  onPress={() => p.navigation.navigate(key as never)}
                >
                  <Icon color={ui.muted} size={20} />
                  <Text
                    style={
                      p.state.routes[p.state.index].name === key
                        ? n.activeText
                        : n.drawerText
                    }
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
          </View>
        ))}
        <View style={n.divider} />
        <Pressable
          style={n.drawerItem}
          onPress={() => {
            void logout().catch(() => {});
          }}
        >
          <LogOut color={ui.danger} />
          <Text style={[n.drawerText, { color: ui.danger }]}>Logout</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
function DrawerNav() {
  const { width } = useWindowDimensions();
  return (
    <Drawer.Navigator
      drawerContent={(p) => <AppDrawer {...p} />}
      screenOptions={{
        headerShown: false,
        drawerType: width >= 768 ? "permanent" : "front",
        drawerStyle: { width: Math.min(width * 0.86, 340) },
        overlayColor: "rgba(20,38,29,.46)",
        swipeEdgeWidth: 28,
      }}
    >
      <Drawer.Screen name="Main" component={MainTabs} />
      {(
        groups as unknown as Array<
          readonly [
            string,
            Array<readonly [string, string, React.ComponentType<any>]>,
          ]
        >
      )
        .flatMap((x) => x[1])
        .map(([key]) => (
          <Drawer.Screen
            key={key}
            name={key as keyof DrawerParamList}
            component={ModuleScreen}
          />
        ))}
    </Drawer.Navigator>
  );
}
export function AppNavigation() {
  const [navigationReady, setNavigationReady] = useState(false);
  const auth = useAppStore((x) => x.authenticated);
  const restoring = useAppStore((x) => x.restoring);
  const restoreError = useAppStore((x) => x.restoreError);
  const restore = useAppStore((x) => x.restore);
  useEffect(() => {
    void restore();
  }, [restore]);
  if (restoring || restoreError)
    return (
      <View style={[l.page, { justifyContent: "center", padding: 24 }]}>
        <Feedback loading={restoring} error={restoreError} retry={restore} />
        {restoreError && (
          <Button
            title="Back to sign in"
            secondary
            onPress={() => {
              void api.clear().catch(() => {});
            }}
          />
        )}
      </View>
    );
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={theme}
      onReady={() => {
        setNavigationReady(true);
        trackScreen();
      }}
      onStateChange={trackScreen}
    >
      <MobileLifecycle
        navigationReady={navigationReady}
        onOpenNotification={openPushNotification}
      />
      <Root.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
        {auth ? (
          <>
            <Root.Screen name="App" component={DrawerNav} />
            <Root.Screen name="WorkspacePage" component={WorkspacePage} />
          </>
        ) : (
          <Root.Screen name="Login" component={FigmaLogin} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
const n = StyleSheet.create({
  drawer: { flex: 1, backgroundColor: ui.sidebar },
  drawerBody: { padding: 16, paddingBottom: 40 },
  workspace: {
    height: 74,
    borderRadius: 14,
    backgroundColor: ui.successSurface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    marginBottom: 16,
  },
  workspaceAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ui.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  workspaceInitials: { color: ui.primary, fontWeight: "800" },
  workspaceTitle: { fontSize: 16, fontWeight: "700", color: ui.ink },
  workspaceSub: { fontSize: 12, color: ui.success, marginTop: 3 },
  activeItem: {
    height: 48,
    borderRadius: 12,
    backgroundColor: ui.sidebarAccent,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
  },
  activeText: {
    fontSize: 15,
    fontWeight: "700",
    color: ui.secondaryForeground,
  },
  group: {
    fontSize: 11,
    fontWeight: "800",
    color: ui.muted,
    letterSpacing: 0.8,
    marginTop: 22,
    marginBottom: 7,
  },
  drawerItem: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
  },
  drawerText: { fontSize: 15, fontWeight: "600", color: ui.ink },
  divider: { height: 1, backgroundColor: ui.sidebarBorder, marginVertical: 15 },
  moduleTitle: { fontSize: 24, fontWeight: "800", color: ui.ink },
  moduleSub: { fontSize: 14, lineHeight: 21, color: ui.body, marginTop: 5 },
  moduleCard: { padding: 18, marginTop: 4 },
  moduleCardTitle: { fontSize: 17, fontWeight: "700", color: ui.ink },
});
