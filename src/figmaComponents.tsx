import { ScrollView } from "./KeyboardLayout";
import { Text, TextInput } from "./themedText";
import React, { useMemo, useState } from "react";
import {
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ui, uiShadow } from "./figmaTheme";
import { BrandLogo } from "./BrandLogo";

const searchItems = [
  {
    title: "Home dashboard",
    subtitle: "Today's overview and urgent chats",
    route: "Home",
    icon: "view-dashboard-outline",
  },
  {
    title: "Inbox",
    subtitle: "Conversations and customer replies",
    route: "Inbox",
    icon: "message-text-outline",
  },
  {
    title: "Campaigns",
    subtitle: "Campaign delivery and performance",
    route: "Campaigns",
    icon: "bullhorn-outline",
  },
  {
    title: "Notifications",
    subtitle: "Alerts and delivery updates",
    route: "Alerts",
    icon: "bell-outline",
  },
  {
    title: "My profile",
    subtitle: "Account and workspace details",
    route: "Profile",
    icon: "account-outline",
  },
] as const;

export const BrandHeader = ({
  onAvatar,
  onSearch = true,
  actions,
}: {
  onAvatar?: () => void;
  onSearch?: boolean;
  actions?: React.ReactNode;
}) => {
  const navigation = useNavigation<any>();
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const matches = useMemo(
    () =>
      searchItems.filter((item) =>
        (item.title + " " + item.subtitle)
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [query],
  );
  const goTo = (route: string) => {
    let current: any = navigation;
    while (current) {
      const state = current.getState?.();
      if (state?.routeNames?.includes(route)) {
        current.navigate(route);
        break;
      }
      current = current.getParent?.();
    }
    setSearching(false);
    setQuery("");
  };
  return (
    <>
      <SafeAreaView edges={["top"]} style={c.safe}>
        <View style={c.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            onPress={onAvatar}
            style={c.headerButton}
          >
            <MaterialCommunityIcons name="menu" size={28} color={ui.primary} />
          </Pressable>
          <View style={[c.brand, { flex: 1 }]}>
            <BrandLogo />
          </View>
          {actions}
          {onSearch && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search workspace"
              onPress={() => setSearching(true)}
              style={({ pressed }) => [c.headerButton, pressed && c.pressed]}
            >
              <MaterialCommunityIcons
                name="magnify"
                size={24}
                color={ui.primary}
              />
            </Pressable>
          )}
        </View>
      </SafeAreaView>
      <Modal
        visible={searching}
        animationType="slide"
        onRequestClose={() => setSearching(false)}
      >
        <SafeAreaView edges={["top", "bottom"]} style={c.searchModal}>
          <View style={c.searchModalHeader}>
            <Pressable
              accessibilityLabel="Close search"
              onPress={() => setSearching(false)}
              style={c.headerButton}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={ui.ink}
              />
            </Pressable>
            <View style={[c.search, { flex: 1 }]}>
              <MaterialCommunityIcons
                name="magnify"
                size={21}
                color={ui.muted}
              />
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Search workspace"
                placeholderTextColor={ui.muted}
                returnKeyType="search"
                style={c.searchInput}
              />
              {query.length > 0 && (
                <Pressable
                  accessibilityLabel="Clear search"
                  onPress={() => setQuery("")}
                >
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={20}
                    color={ui.muted}
                  />
                </Pressable>
              )}
            </View>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={c.searchResults}
          >
            <Text style={c.searchEyebrow}>
              {query ? "PAGES" : "QUICK LINKS"}
            </Text>
            {matches.map((item) => (
              <Pressable
                key={item.title}
                onPress={() => goTo(item.route)}
                style={({ pressed }) => [
                  c.searchResult,
                  pressed && c.searchResultPressed,
                ]}
              >
                <View style={c.searchResultIcon}>
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={22}
                    color={ui.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={c.searchResultTitle}>{item.title}</Text>
                  <Text style={c.searchResultSub}>{item.subtitle}</Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={ui.muted}
                />
              </Pressable>
            ))}
            {matches.length === 0 && (
              <View style={c.emptySearch}>
                <MaterialCommunityIcons
                  name="magnify-close"
                  size={34}
                  color={ui.muted}
                />
                <Text style={c.searchResultTitle}>No matching results</Text>
                <Text style={c.searchResultSub}>
                  Search for a page. Use the inbox search to find contacts and
                  messages.
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
};
export const Page = ({
  children,
  scroll = true,
  padded = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
}) =>
  scroll ? (
    <ScrollView
      style={c.page}
      contentContainerStyle={[c.content, padded && c.padded]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[c.page, padded && c.padded]}>{children}</View>
  );
export const Surface = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) => <View style={[c.surface, style]}>{children}</View>;
export const Heading = ({
  children,
  action,
}: {
  children: string;
  action?: React.ReactNode;
}) => (
  <View style={c.headingRow}>
    <Text style={c.heading}>{children}</Text>
    {action}
  </View>
);
export const Pill = ({
  text,
  active = false,
  dot,
  onPress,
}: {
  text: string;
  active?: boolean;
  dot?: string;
  onPress?: () => void;
}) => (
  <Pressable onPress={onPress} style={[c.pill, active && c.pillActive]}>
    {dot && <View style={[c.pillDot, { backgroundColor: dot }]} />}
    <Text style={[c.pillText, active && c.pillTextActive]}>{text}</Text>
  </Pressable>
);
export const SearchBox = ({
  value,
  onChangeText,
  placeholder = "Search conversations...",
}: {
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
}) => (
  <View style={c.search}>
    <MaterialCommunityIcons name="magnify" size={21} color={ui.muted} />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={ui.muted}
      returnKeyType="search"
      autoCorrect={false}
      style={c.searchInput}
    />
    {value.length > 0 && (
      <Pressable
        accessibilityLabel="Clear search"
        onPress={() => onChangeText("")}
      >
        <MaterialCommunityIcons
          name="close-circle"
          size={20}
          color={ui.muted}
        />
      </Pressable>
    )}
  </View>
);
export const Photo = ({
  source,
  size = 48,
}: {
  source: ImageSourcePropType;
  size?: number;
}) => (
  <Image
    source={source}
    style={{ width: size, height: size, borderRadius: size / 2 }}
  />
);
export const Badge = ({
  text,
  tone = "purple",
}: {
  text: string;
  tone?: "purple" | "red" | "orange" | "outline";
}) => {
  const bg =
    tone === "red"
      ? ui.danger
      : tone === "orange"
        ? ui.warning
        : tone === "outline"
          ? "transparent"
          : ui.accent;
  return (
    <View
      style={[
        c.badge,
        { backgroundColor: bg },
        tone === "outline" && c.badgeOutline,
      ]}
    >
      <Text
        style={[
          c.badgeText,
          {
            color:
              tone === "red" || tone === "orange"
                ? ui.white
                : tone === "outline"
                  ? ui.muted
                  : ui.body,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
};
export const c = StyleSheet.create({
  safe: { backgroundColor: ui.bg },
  header: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: ui.bg,
  },
  brand: { minWidth: 0, height: 48, justifyContent: "center" },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { backgroundColor: ui.successSurface },
  page: { flex: 1, backgroundColor: ui.bg },
  content: { paddingBottom: 32, gap: 24 },
  padded: { paddingHorizontal: 16 },
  surface: {
    backgroundColor: ui.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.line,
    ...uiShadow,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: "700", color: ui.ink },
  pill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: ui.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  pillActive: { backgroundColor: ui.primaryHover },
  pillText: { fontSize: 14, fontWeight: "600", color: ui.body },
  pillTextActive: { color: ui.white },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  search: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: ui.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 15, color: ui.ink, paddingVertical: 0 },
  searchModal: { flex: 1, backgroundColor: ui.bg },
  searchModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: ui.line,
  },
  searchResults: { padding: 16, gap: 8 },
  searchEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: ui.muted,
    marginVertical: 8,
  },
  searchResult: {
    minHeight: 68,
    borderRadius: 14,
    backgroundColor: ui.white,
    borderWidth: 1,
    borderColor: ui.line,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchResultPressed: { backgroundColor: ui.successSurface },
  searchResultIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: ui.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultTitle: { fontSize: 15, fontWeight: "700", color: ui.ink },
  searchResultSub: { fontSize: 12, color: ui.body, marginTop: 3 },
  emptySearch: { alignItems: "center", paddingTop: 64, gap: 8 },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeOutline: { borderWidth: 1, borderColor: ui.line },
  badgeText: { fontSize: 10, lineHeight: 15, letterSpacing: 0.4 },
});
