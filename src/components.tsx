import { ScrollView } from "./KeyboardLayout";
import { Text, TextInput } from "./themedText";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  ViewProps,
} from "react-native";
import {
  ArrowLeft,
  Bell,
  Menu,
  Search,
  ChevronRight,
  Plus,
  X,
  CheckCheck,
  MessageCircle,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, shadow, spacing } from "./theme";

export const Screen = ({
  children,
  scroll = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewProps["style"];
}) =>
  scroll ? (
    <ScrollView
      contentContainerStyle={[s.screen, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[s.screen, s.fill, style]}>{children}</View>
  );
export const AppHeader = ({
  title,
  subtitle,
  onMenu,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onMenu?: () => void;
  onBack?: () => void;
  right?: React.ReactNode;
}) => {
  const insets = useSafeAreaInsets();
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [notifications, setNotifications] = useState(false);
  return (
    <>
      <View
        style={[s.header, { height: 58 + insets.top, paddingTop: insets.top }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={onBack ? "Go back" : "Open navigation menu"}
          hitSlop={8}
          onPress={onBack ?? onMenu}
          style={s.iconButton}
        >
          {onBack ? (
            <ArrowLeft size={23} color={colors.textPrimary} />
          ) : (
            <Menu size={23} color={colors.textPrimary} />
          )}
        </Pressable>
        {searching ? (
          <View style={s.headerSearch}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search workspace…"
              placeholderTextColor={colors.textMuted}
              style={s.headerSearchInput}
            />
            <Pressable
              onPress={() => {
                setQuery("");
                setSearching(false);
              }}
            >
              <X size={19} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : (
          <View style={s.headerTitle}>
            <Text numberOfLines={1} style={s.h2}>
              {title}
            </Text>
            {subtitle && (
              <Text numberOfLines={1} style={s.caption}>
                {subtitle}
              </Text>
            )}
          </View>
        )}
        {right ??
          (!searching && (
            <View style={s.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Search workspace"
                onPress={() => setSearching(true)}
                style={s.iconButton}
              >
                <Search size={21} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open notifications"
                onPress={() => setNotifications(true)}
                style={s.iconButton}
              >
                <Bell size={21} color={colors.textSecondary} />
                <View style={s.notificationDot} />
              </Pressable>
            </View>
          ))}
      </View>
      {searching && query.trim().length > 1 && (
        <View style={s.searchResults}>
          <Text style={s.searchResultLabel}>Workspace results</Text>
          <Pressable
            onPress={() => {
              setSearching(false);
              setQuery("");
            }}
            style={s.searchResultRow}
          >
            <View style={s.noticeIcon}>
              <MessageCircle size={17} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>Search for “{query.trim()}”</Text>
              <Text style={s.caption}>
                Conversations, contacts and campaigns
              </Text>
            </View>
            <ChevronRight size={17} color={colors.textMuted} />
          </Pressable>
        </View>
      )}
      <Modal
        visible={notifications}
        transparent
        animationType="fade"
        onRequestClose={() => setNotifications(false)}
      >
        <Pressable style={s.modalShade} onPress={() => setNotifications(false)}>
          <Pressable
            style={[s.notificationPanel, { marginTop: insets.top + 54 }]}
            onPress={() => {}}
          >
            <View style={s.notificationHead}>
              <Text style={s.h3}>Notifications</Text>
              <Pressable
                onPress={() => setNotifications(false)}
                style={s.iconButton}
              >
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={s.notice}>
              <View style={s.noticeIcon}>
                <MessageCircle size={18} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>3 new conversations</Text>
                <Text style={s.caption}>
                  New WhatsApp messages need a reply.
                </Text>
              </View>
            </View>
            <View style={s.notice}>
              <View style={s.noticeIcon}>
                <CheckCheck size={18} color={colors.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>Campaign completed</Text>
                <Text style={s.caption}>
                  Customer Feedback reached 84% reads.
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setNotifications(false)}
              style={s.noticeAction}
            >
              <Text style={s.link}>Mark all as read</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};
export const Card = ({ children, style }: ViewProps) => (
  <View style={[s.card, style]}>{children}</View>
);
export const SectionHeader = ({
  title,
  action,
}: {
  title: string;
  action?: string;
}) => (
  <View style={s.sectionHead}>
    <Text style={s.h3}>{title}</Text>
    {action && <Text style={s.link}>{action}</Text>}
  </View>
);
export const Avatar = ({
  initials,
  color = "#4F7CFF",
  size = 44,
}: {
  initials: string;
  color?: string;
  size?: number;
}) => (
  <View
    style={[
      s.avatar,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + "20",
      },
    ]}
  >
    <Text style={[s.avatarText, { color, fontSize: size * 0.32 }]}>
      {initials}
    </Text>
  </View>
);
export const StatusBadge = ({ label }: { label: string }) => {
  const c =
    label === "Open" || label === "Running" || label === "Connected"
      ? colors.success
      : label === "Pending" || label === "Scheduled"
        ? colors.warning
        : colors.textSecondary;
  return (
    <View style={[s.badge, { backgroundColor: c + "18" }]}>
      <View style={[s.dot, { backgroundColor: c }]} />
      <Text style={[s.badgeText, { color: c }]}>{label}</Text>
    </View>
  );
};
export const Tag = ({ label }: { label: string }) => (
  <View style={s.tag}>
    <Text style={s.tagText}>{label}</Text>
  </View>
);
export const SearchBar = ({
  placeholder = "Search",
  value,
  onChangeText,
}: {
  placeholder?: string;
  value?: string;
  onChangeText?: (v: string) => void;
}) => (
  <View style={s.search}>
    <Search size={19} color={colors.textMuted} />
    <TextInput
      accessibilityLabel={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      style={s.searchInput}
    />
  </View>
);
export const FilterRow = ({
  items,
  active,
  onChange,
}: {
  items: string[];
  active: string;
  onChange: (v: string) => void;
}) => (
  <ScrollView
    horizontal
    style={s.filterScroll}
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={s.filters}
  >
    {items.map((x) => (
      <Pressable
        key={x}
        onPress={() => onChange(x)}
        style={[s.filter, x === active && s.filterActive]}
      >
        <Text
          numberOfLines={1}
          style={[s.filterText, x === active && s.filterTextActive]}
        >
          {x}
        </Text>
      </Pressable>
    ))}
  </ScrollView>
);
export const MetricCard = ({
  label,
  value,
  change,
  color = colors.primary,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  color?: string;
  icon: React.ReactNode;
}) => (
  <Card style={s.metric}>
    <View style={[s.metricIcon, { backgroundColor: color + "16" }]}>
      {icon}
    </View>
    <Text style={s.metricValue}>{value}</Text>
    <Text style={s.metricLabel}>{label}</Text>
    <Text
      style={[
        s.metricChange,
        {
          color: change.startsWith("+") ? colors.success : colors.textSecondary,
        },
      ]}
    >
      {change}
    </Text>
  </Card>
);
export const EmptyState = ({
  title = "Nothing here yet",
  body = "New items will appear here.",
}: {
  title?: string;
  body?: string;
}) => (
  <View style={s.empty}>
    <View style={s.emptyIcon}>
      <Search size={26} color={colors.primary} />
    </View>
    <Text style={s.h3}>{title}</Text>
    <Text style={s.bodyMuted}>{body}</Text>
  </View>
);
export const LoadingSkeleton = () => (
  <View style={s.empty}>
    <ActivityIndicator color={colors.primary} />
    <Text style={s.bodyMuted}>Loading workspace…</Text>
  </View>
);
export const FAB = ({
  onPress,
  label = "Create",
}: {
  onPress: () => void;
  label?: string;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    style={s.fab}
  >
    <Plus color="white" size={23} />
  </Pressable>
);
export const RowLink = ({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
}) => (
  <Pressable onPress={onPress} style={s.rowLink}>
    <View style={s.rowIcon}>{icon}</View>
    <View style={s.rowBody}>
      <Text style={s.rowTitle}>{title}</Text>
      {subtitle && <Text style={s.caption}>{subtitle}</Text>}
    </View>
    <ChevronRight size={18} color={colors.textMuted} />
  </Pressable>
);

const s = StyleSheet.create({
  fill: { flex: 1 },
  screen: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
    backgroundColor: colors.background,
  },
  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: { flex: 1, paddingHorizontal: 4 },
  headerActions: { flexDirection: "row" },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.danger,
    top: 9,
    right: 9,
    borderWidth: 1,
    borderColor: "white",
  },
  h2: { fontSize: 19, fontWeight: "700", color: colors.textPrimary },
  h3: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  caption: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  bodyMuted: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  link: { fontSize: 13, fontWeight: "600", color: colors.primaryDark },
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "700" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  tag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
  },
  tagText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  search: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  filterScroll: { flexGrow: 0, flexShrink: 0, maxHeight: 44 },
  filters: { gap: 8, alignItems: "center", paddingRight: 16 },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary + "55",
  },
  filterText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  filterTextActive: { color: colors.primaryDark },
  metric: { minWidth: 150, flex: 1 },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  metricValue: { fontSize: 25, fontWeight: "800", color: colors.textPrimary },
  metricLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  metricChange: { fontSize: 11, fontWeight: "600", marginTop: 9 },
  empty: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  rowLink: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1 },
  headerSearch: {
    flex: 1,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  searchResults: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadow,
  },
  searchResultLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: colors.textMuted,
    marginBottom: 5,
  },
  searchResultRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalShade: {
    flex: 1,
    backgroundColor: "rgba(16,24,47,0.24)",
    alignItems: "flex-end",
  },
  notificationPanel: {
    width: "88%",
    maxWidth: 380,
    marginRight: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadow,
  },
  notificationHead: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  noticeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeAction: {
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  rowTitle: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
});

export { s as common };
