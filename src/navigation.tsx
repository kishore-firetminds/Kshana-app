import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  getFocusedRouteNameFromRoute,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

const Root = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();
const InboxStack = createNativeStackNavigator<InboxStackParamList>();
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: ui.bg,
    primary: ui.purple,
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
const tabIconNames = {
  Home: "home-variant-outline",
  Inbox: "message-text-outline",
  Campaigns: "bullhorn-outline",
  Alerts: "bell-outline",
  Profile: "account-circle-outline",
} as const;
function ResponsiveTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const focusedRoute = state.routes[state.index];
  if (getFocusedRouteNameFromRoute(focusedRoute) === "Conversation")
    return null;
  const compact = width < 360;
  return (
    <BlurView
      tint="extraLight"
      intensity={88}
      experimentalBlurMethod="dimezisBlurView"
      blurReductionFactor={3}
      style={[
        n.tabBar,
        {
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 5),
        },
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(255,255,255,.92)",
          "rgba(255,255,255,.48)",
          "rgba(241,229,255,.56)",
        ]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={n.glassHighlight} />
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const configuredLabel = descriptors[route.key].options.tabBarLabel;
        const label: string =
          typeof configuredLabel === "string" ? configuredLabel : route.name;
        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented)
            navigation.navigate(route.name, route.params);
        };
        const contents = (
          <>
            <MaterialCommunityIcons
              name={
                tabIconNames[route.name as keyof typeof tabIconNames] as any
              }
              size={compact ? 21 : 22}
              color={focused ? ui.white : "#685395"}
            />
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[
                n.tabLabel,
                compact && n.tabLabelCompact,
                focused && n.tabLabelActive,
              ]}
            >
              {label}
            </Text>
          </>
        );
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={`${label} tab`}
            onPress={onPress}
            onLongPress={() =>
              navigation.emit({ type: "tabLongPress", target: route.key })
            }
            style={({ pressed }) => [n.tabButton, pressed && n.tabPressed]}
          >
            <View
              style={[
                n.tabPillShell,
                compact && n.tabPillCompact,
                focused && n.tabPillActive,
              ]}
            >
              {focused ? (
                <LinearGradient
                  colors={["#8D4FE7", "#6220C4", "#410093"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={n.tabPill}
                >
                  <View pointerEvents="none" style={n.pillSheen} />
                  {contents}
                </LinearGradient>
              ) : (
                <View style={n.tabPill}>{contents}</View>
              )}
            </View>
          </Pressable>
        );
      })}
    </BlurView>
  );
}
function MainTabs() {
  return (
    <Tabs.Navigator
      tabBar={(props) => <ResponsiveTabBar {...props} />}
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
    ],
  ],
  [
    "MANAGEMENT",
    [
      ["Analytics", "Analytics", BarChart3],
      ["Team", "Team Management", Users],
      ["Integrations", "Integrations", LayoutGrid],
    ],
  ],
  [
    "ACCOUNT",
    [
      ["Subscription", "Subscription & Usage", WalletCards],
      ["Settings", "Settings", Settings],
      ["Help", "Help & Support", CircleHelp],
    ],
  ],
] as const;
function AppDrawer(p: DrawerContentComponentProps) {
  const logout = useAppStore((x) => x.logout);
  return (
    <View style={n.drawer}>
      <BrandHeader onSearch={false} />
      <ScrollView contentContainerStyle={n.drawerBody}>
        <View style={n.workspace}>
          <View style={n.workspaceAvatar}>
            <Text style={n.workspaceInitials}>FL</Text>
          </View>
          <View>
            <Text style={n.workspaceTitle}>Fireside Labs</Text>
            <Text style={n.workspaceSub}>WhatsApp connected</Text>
          </View>
        </View>
        <Pressable
          style={n.activeItem}
          onPress={() => p.navigation.navigate("Main")}
        >
          <Home color={ui.purple} size={20} />
          <Text style={n.activeText}>Dashboard</Text>
        </Pressable>
        {groups.map(([group, items]) => (
          <View key={group}>
            <Text style={n.group}>{group}</Text>
            {items.map(([key, label, Icon]) => (
              <Pressable
                key={key}
                style={n.drawerItem}
                onPress={() => p.navigation.navigate(key as never)}
              >
                <Icon color="#685395" size={20} />
                <Text style={n.drawerText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={n.divider} />
        <Pressable style={n.drawerItem} onPress={logout}>
          <LogOut color={ui.danger} />
          <Text style={[n.drawerText, { color: ui.danger }]}>Logout</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
function Secondary({ route, navigation }: any) {
  return (
    <>
      <BrandHeader onAvatar={() => navigation.openDrawer()} />
      <Page>
        <Text style={n.moduleTitle}>{route.name}</Text>
        <Text style={n.moduleSub}>
          Manage your {route.name.toLowerCase()} workspace.
        </Text>
        <Surface style={n.moduleCard}>
          <Text style={n.moduleCardTitle}>Workspace overview</Text>
          <Text style={n.moduleSub}>
            Your data is connected and up to date.
          </Text>
        </Surface>
      </Page>
    </>
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
        overlayColor: "rgba(29,26,35,.46)",
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
            component={Secondary}
          />
        ))}
    </Drawer.Navigator>
  );
}
export function AppNavigation() {
  const auth = useAppStore((x) => x.authenticated);
  return (
    <NavigationContainer theme={theme}>
      <Root.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
        {auth ? (
          <Root.Screen name="App" component={DrawerNav} />
        ) : (
          <Root.Screen name="Login" component={FigmaLogin} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
const n = StyleSheet.create({
  tabBar: {
    backgroundColor: "rgba(255,255,255,.7)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,.9)",
    paddingTop: 5,
    paddingHorizontal: 5,
    flexDirection: "row",
    alignItems: "flex-start",
    overflow: "hidden",
    shadowColor: "#241039",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 16,
  },
  glassHighlight: {
    position: "absolute",
    top: 1,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: "rgba(255,255,255,.96)",
    borderRadius: 1,
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  tabPressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  tabPillShell: { minWidth: 64, height: 46, borderRadius: 16 },
  tabPill: {
    flex: 1,
    paddingHorizontal: 7,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    overflow: "hidden",
  },
  tabPillCompact: { minWidth: 52 },
  tabPillActive: {
    shadowColor: "#5B19BE",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.38,
    shadowRadius: 8,
    elevation: 7,
  },
  pillSheen: {
    position: "absolute",
    top: 1,
    left: 8,
    right: 8,
    height: "43%",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,.18)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,.38)",
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.15,
    color: "#685395",
  },
  tabLabelCompact: { fontSize: 9.5, letterSpacing: 0 },
  tabLabelActive: {
    color: ui.white,
    textShadowColor: "rgba(30,0,70,.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  drawer: { flex: 1, backgroundColor: ui.white },
  drawerBody: { padding: 16, paddingBottom: 40 },
  workspace: {
    height: 74,
    borderRadius: 14,
    backgroundColor: ui.purpleSurface,
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
    backgroundColor: ui.lavender,
    alignItems: "center",
    justifyContent: "center",
  },
  workspaceInitials: { color: ui.purple, fontWeight: "800" },
  workspaceTitle: { fontSize: 16, fontWeight: "700", color: ui.ink },
  workspaceSub: { fontSize: 12, color: ui.success, marginTop: 3 },
  activeItem: {
    height: 48,
    borderRadius: 12,
    backgroundColor: ui.purpleSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
  },
  activeText: { fontSize: 15, fontWeight: "700", color: ui.purple },
  group: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9D91A8",
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
  divider: { height: 1, backgroundColor: "#EEE8F1", marginVertical: 15 },
  moduleTitle: { fontSize: 24, fontWeight: "800", color: ui.ink },
  moduleSub: { fontSize: 14, lineHeight: 21, color: ui.body, marginTop: 5 },
  moduleCard: { padding: 18, marginTop: 4 },
  moduleCardTitle: { fontSize: 17, fontWeight: "700", color: ui.ink },
});
