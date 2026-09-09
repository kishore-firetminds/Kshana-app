import { Text, TextInput } from "./themedText";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  CheckCheck,
  ChevronRight,
  Clock3,
  FileText,
  Inbox,
  LayoutGrid,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Phone,
  Send,
  Settings,
  Smile,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Volume2,
  Zap,
} from "lucide-react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Avatar,
  Card,
  EmptyState,
  FAB,
  FilterRow,
  MetricCard,
  RowLink,
  Screen,
  SearchBar,
  SectionHeader,
  StatusBadge,
  Tag,
  common,
} from "./components";
import { campaigns, contacts, conversations } from "./data";
import { colors, radius, shadow, spacing } from "./theme";
import {
  CampaignStackParamList,
  ContactsStackParamList,
  InboxStackParamList,
} from "./types";
import { useAppStore } from "./store";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const GreetingHero = () => (
  <Animated.View entering={FadeInDown.duration(450)} style={st.greetingShell}>
    <LinearGradient
      colors={["#08783F", "#10A95A", "#16C768"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={st.greetingGradient}
    >
      <View style={st.waveOne} />
      <View style={st.waveTwo} />
      <View style={st.glossOrb} />
      <View style={st.greetingContent}>
        <Text style={st.greetingLight}>Good morning, Priya 👋</Text>
        <Text style={st.subGreeting}>
          Here’s what’s happening at Fireside Labs.
        </Text>
        <View style={st.livePill}>
          <View style={st.liveDot} />
          <Text style={st.liveText}>Workspace live</Text>
        </View>
      </View>
    </LinearGradient>
  </Animated.View>
);

export { FigmaLogin as LoginScreen } from "./figmaScreens";

export function HomeScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const [period, setPeriod] = useState("7 days");
  return (
    <Screen>
      <GreetingHero />
      <FilterRow
        items={["Today", "7 days", "30 days"]}
        active={period}
        onChange={setPeriod}
      />
      <View style={st.metricGrid}>
        <MetricCard
          label="Unread conversations"
          value="24"
          change="+12% this week"
          icon={<Inbox size={20} color={colors.primary} />}
        />
        <MetricCard
          label="Open conversations"
          value="68"
          change="8 need attention"
          color={colors.info}
          icon={<MessageCircle size={20} color={colors.info} />}
        />
        <MetricCard
          label="Messages sent"
          value="8,429"
          change="+18.4% this week"
          color={colors.purple}
          icon={<Send size={20} color={colors.purple} />}
        />
        <MetricCard
          label="Delivery rate"
          value="96.8%"
          change="+1.2% this week"
          color={colors.warning}
          icon={<TrendingUp size={20} color={colors.warning} />}
        />
      </View>
      <View style={[wide && st.columns]}>
        <View style={st.column}>
          <SectionHeader title="Recent conversations" action="View inbox" />
          <Card style={st.listCard}>
            {conversations.slice(0, 3).map((c) => (
              <ConversationRow key={c.id} item={c} />
            ))}
          </Card>
        </View>
        <View style={st.column}>
          <SectionHeader title="Campaign performance" action="View all" />
          <Card>
            <View style={st.campaignHero}>
              <View style={st.campaignIcon}>
                <Target color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.cardTitle}>Monsoon Upgrade Offer</Text>
                <Text style={st.muted}>Running · 3,240 of 5,000 sent</Text>
              </View>
              <StatusBadge label="Running" />
            </View>
            <View style={st.progressTrack}>
              <View style={[st.progressFill, { width: "65%" }]} />
            </View>
            <View style={st.stats}>
              <MiniStat value="78%" label="Read" />
              <MiniStat value="312" label="Replies" />
              <MiniStat value="2.1%" label="Failed" />
            </View>
          </Card>
          <SectionHeader title="Quick actions" />
          <View style={st.quickGrid}>
            <Quick
              icon={<MessageCircle color={colors.primaryDark} />}
              label="New message"
            />
            <Quick
              icon={<UserPlus color={colors.info} />}
              label="Add contact"
            />
            <Quick icon={<Zap color={colors.purple} />} label="Campaign" />
          </View>
        </View>
      </View>
    </Screen>
  );
}
const MiniStat = ({ value, label }: { value: string; label: string }) => (
  <View>
    <Text style={st.miniValue}>{value}</Text>
    <Text style={st.miniLabel}>{label}</Text>
  </View>
);
const Quick = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <Pressable style={st.quick}>
    {icon}
    <Text style={st.quickText}>{label}</Text>
  </Pressable>
);
const ConversationRow = ({
  item,
  onPress,
}: {
  item: (typeof conversations)[number];
  onPress?: () => void;
}) => (
  <Pressable onPress={onPress} style={st.conversation}>
    <Avatar initials={item.initials} color={item.color} />
    <View style={st.conversationBody}>
      <View style={st.between}>
        <Text style={st.cardTitle}>{item.name}</Text>
        <Text style={st.time}>{item.time}</Text>
      </View>
      <View style={st.between}>
        <Text numberOfLines={1} style={st.preview}>
          {item.message}
        </Text>
        {item.unread > 0 && (
          <View style={st.unread}>
            <Text style={st.unreadText}>{item.unread}</Text>
          </View>
        )}
      </View>
      <View style={st.rowGap}>
        <StatusBadge label={item.status} />
        <Tag label={item.tag} />
      </View>
    </View>
  </Pressable>
);

export function InboxScreen({
  navigation,
}: NativeStackScreenProps<InboxStackParamList, "InboxList">) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const data = useMemo(
    () =>
      conversations.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) &&
          (filter === "All" || filter === c.status),
      ),
    [q, filter],
  );
  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };
  return (
    <Screen scroll={false} style={st.listScreen}>
      <SearchBar
        placeholder="Search conversations"
        value={q}
        onChangeText={setQ}
      />
      <FilterRow
        items={["All", "Mine", "Unassigned", "Pending", "Resolved"]}
        active={filter}
        onChange={setFilter}
      />
      <FlatList
        data={data}
        keyExtractor={(x) => x.id}
        contentContainerStyle={st.flatList}
        renderItem={({ item }) => (
          <Card style={st.conversationCard}>
            <ConversationRow
              item={item}
              onPress={() =>
                navigation.navigate("Conversation", { id: item.id })
              }
            />
          </Card>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={refresh}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No conversations found"
            body="Try another search or filter."
          />
        }
      />
    </Screen>
  );
}

export function ConversationScreen({
  route,
  navigation,
}: NativeStackScreenProps<InboxStackParamList, "Conversation">) {
  const c =
    conversations.find((x) => x.id === route.params.id) ?? conversations[0];
  const [text, setText] = useState("");
  const tabNavigation = navigation.getParent();
  useEffect(() => {
    tabNavigation?.setOptions({ tabBarStyle: { display: "none" } });
    return () => tabNavigation?.setOptions({ tabBarStyle: undefined });
  }, [tabNavigation]);
  return (
    <KeyboardAvoidingView
      style={st.chat}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView edges={["top"]} style={st.chatSafeHeader}>
        <View style={st.contactHeader}>
          <Pressable onPress={navigation.goBack} style={common.iconButton}>
            <ArrowLeft color={colors.textPrimary} />
          </Pressable>
          <Avatar initials={c.initials} color={c.color} size={38} />
          <Pressable
            style={{ flex: 1 }}
            onPress={() => navigation.navigate("ContactDetails", { id: c.id })}
          >
            <Text style={st.cardTitle}>{c.name}</Text>
            <Text style={st.online}>● Active on WhatsApp</Text>
          </Pressable>
          <Pressable style={common.iconButton}>
            <Phone size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable style={common.iconButton}>
            <MoreHorizontal size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
      </SafeAreaView>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={st.messages}
        data={[1, 2, 3, 4]}
        keyExtractor={String}
        renderItem={({ item }) =>
          item % 2 ? (
            <View style={st.messageIn}>
              <Text style={st.messageText}>
                {item === 1
                  ? "Hi! I saw your campaign and would like to know more."
                  : "Yes, please share the pricing details."}
              </Text>
              <Text style={st.messageTime}>10:{item}2 AM</Text>
            </View>
          ) : (
            <View style={st.messageOut}>
              <Text style={st.messageText}>
                Absolutely! I’ll send the plans right away.
              </Text>
              <View style={st.sentMeta}>
                <Text style={st.messageTime}>10:{item}4 AM</Text>
                <CheckCheck size={14} color={colors.info} />
              </View>
            </View>
          )
        }
        ListHeaderComponent={<Text style={st.datePill}>Today</Text>}
      />
      <View style={st.composer}>
        <Pressable style={common.iconButton}>
          <Paperclip color={colors.textSecondary} size={21} />
        </Pressable>
        <TextInput
          multiline
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          style={st.composerInput}
        />
        <Pressable style={common.iconButton}>
          <Smile color={colors.textSecondary} size={21} />
        </Pressable>
        <Pressable onPress={() => setText("")} style={st.send}>
          <Send color="white" size={19} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

export function ContactsScreen({
  navigation,
}: NativeStackScreenProps<ContactsStackParamList, "ContactsList">) {
  const [q, setQ] = useState("");
  const data = contacts.filter((c) =>
    c.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <View style={{ flex: 1 }}>
      <Screen scroll={false} style={st.listScreen}>
        <SearchBar
          placeholder="Search name or phone"
          value={q}
          onChangeText={setQ}
        />
        <FilterRow
          items={["All", "Hot leads", "Customers", "Unassigned"]}
          active="All"
          onChange={() => {}}
        />
        <FlatList
          data={data}
          keyExtractor={(x) => x.id}
          contentContainerStyle={st.flatList}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate("ContactDetails", { id: item.id })
              }
            >
              <Card style={st.contactCard}>
                <Avatar initials={item.initials} color={item.color} />
                <View style={{ flex: 1 }}>
                  <Text style={st.cardTitle}>{item.name}</Text>
                  <Text style={st.muted}>{item.phone}</Text>
                  <View style={st.rowGap}>
                    <Tag label={item.tag} />
                    <Text style={st.time}>{item.lastSeen}</Text>
                  </View>
                </View>
                <ChevronRight color={colors.textMuted} size={18} />
              </Card>
            </Pressable>
          )}
        />
      </Screen>
      <FAB
        label="Add contact"
        onPress={() => navigation.navigate("AddContact")}
      />
    </View>
  );
}

export function CampaignsScreen({
  navigation,
}: NativeStackScreenProps<CampaignStackParamList, "CampaignList">) {
  const [filter, setFilter] = useState("All");
  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Card style={st.overview}>
          <View>
            <Text style={st.muted}>Messages this month</Text>
            <Text style={st.overviewValue}>12,948</Text>
          </View>
          <View style={st.overviewDivider} />
          <View>
            <Text style={st.muted}>Avg. read rate</Text>
            <Text style={st.overviewValue}>81.4%</Text>
          </View>
        </Card>
        <FilterRow
          items={["All", "Running", "Scheduled", "Draft", "Completed"]}
          active={filter}
          onChange={setFilter}
        />
        {campaigns
          .filter((c) => filter === "All" || c.status === filter)
          .map((c) => (
            <Pressable
              key={c.id}
              onPress={() =>
                navigation.navigate("CampaignDetails", { id: c.id })
              }
            >
              <Card>
                <View style={st.between}>
                  <View style={st.campaignIcon}>
                    <Target color={colors.primaryDark} size={20} />
                  </View>
                  <StatusBadge label={c.status} />
                </View>
                <Text style={[st.cardTitle, { marginTop: 14 }]}>{c.name}</Text>
                <Text style={st.muted}>
                  {c.total.toLocaleString()} recipients
                </Text>
                <View style={st.progressTrack}>
                  <View
                    style={[
                      st.progressFill,
                      { width: `${c.total ? (c.sent / c.total) * 100 : 0}%` },
                    ]}
                  />
                </View>
                <View style={st.stats}>
                  <MiniStat value={c.sent.toLocaleString()} label="Sent" />
                  <MiniStat value={`${c.read}%`} label="Read" />
                  <MiniStat value={String(c.replies)} label="Replies" />
                </View>
              </Card>
            </Pressable>
          ))}
      </Screen>
      <FAB
        label="Create campaign"
        onPress={() => navigation.navigate("CreateCampaign")}
      />
    </View>
  );
}

export function MoreScreen({ navigation }: { navigation: any }) {
  const items = [
    ["Templates", "Pre-approved WhatsApp messages", FileText],
    ["Analytics", "Reports and business insights", BarChart3],
    ["Automations", "Build smart workflows", Zap],
    ["Team", "People, roles and workload", Users],
    ["Integrations", "Connect your business tools", LayoutGrid],
    ["Subscription", "Plan and usage", ArrowUpRight],
    ["Settings", "Workspace preferences", Settings],
    ["Help", "Guides and support", MessageCircle],
  ];
  return (
    <Screen>
      <View>
        <Text style={st.greeting}>More tools</Text>
        <Text style={st.subhero}>Manage and grow your workspace.</Text>
      </View>
      <Card style={st.listCard}>
        {items.map(([title, sub, Icon]: any) => (
          <RowLink
            key={title}
            title={title}
            subtitle={sub}
            icon={<Icon size={20} color={colors.primaryDark} />}
            onPress={() => navigation.getParent()?.navigate(title)}
          />
        ))}
      </Card>
    </Screen>
  );
}

export function ModuleScreen({ route }: { route: any }) {
  const title = route.name;
  return (
    <Screen>
      <View style={st.moduleHero}>
        <View style={st.moduleIcon}>
          <LayoutGrid color={colors.primaryDark} size={30} />
        </View>
        <Text style={st.hero}>{title}</Text>
        <Text style={st.subhero}>
          Everything you need to manage {title.toLowerCase()} in your WhatsApp
          workspace.
        </Text>
      </View>
      <Card>
        <SectionHeader title="Workspace overview" />
        <RowLink
          title="Connected and ready"
          subtitle="Your workspace data is up to date"
          icon={<CheckCheck size={20} color={colors.primaryDark} />}
        />
        <RowLink
          title="Recent activity"
          subtitle="View the latest workspace changes"
          icon={<Clock3 size={20} color={colors.primaryDark} />}
        />
        <RowLink
          title="Manage preferences"
          subtitle={`Configure ${title.toLowerCase()}`}
          icon={<Settings size={20} color={colors.primaryDark} />}
        />
      </Card>
    </Screen>
  );
}
export function ContactDetailsScreen({ route }: any) {
  const c = contacts.find((x) => x.id === route.params.id) ?? contacts[0];
  return (
    <Screen>
      <View style={st.profile}>
        <Avatar initials={c.initials} color={c.color} size={72} />
        <Text style={st.hero}>{c.name}</Text>
        <Text style={st.subhero}>{c.phone}</Text>
        <StatusBadge label="Connected" />
      </View>
      <Card>
        <SectionHeader title="Contact details" />
        <RowLink
          title="WhatsApp"
          subtitle={c.phone}
          icon={<Phone color={colors.primaryDark} size={20} />}
        />
        <RowLink
          title="Customer stage"
          subtitle={c.tag}
          icon={<Target color={colors.primaryDark} size={20} />}
        />
        <RowLink
          title="Last activity"
          subtitle={c.lastSeen}
          icon={<Clock3 color={colors.primaryDark} size={20} />}
        />
      </Card>
      <Card>
        <SectionHeader title="Notes" action="Add note" />
        <Text style={st.muted}>
          Interested in the business plan. Follow up after the product demo.
        </Text>
      </Card>
    </Screen>
  );
}
export function FormScreen({ route, navigation }: any) {
  const campaign = route.name === "CreateCampaign";
  return (
    <Screen>
      <Text style={st.subhero}>
        {campaign
          ? "Set up a targeted WhatsApp campaign."
          : "Create a contact for your workspace."}
      </Text>
      <Card>
        <Text style={st.label}>{campaign ? "Campaign name" : "Full name"}</Text>
        <TextInput
          style={st.input}
          placeholder={
            campaign ? "e.g. August product update" : "Enter full name"
          }
        />
        <Text style={st.label}>
          {campaign ? "Audience" : "WhatsApp number"}
        </Text>
        <TextInput
          style={st.input}
          placeholder={campaign ? "Select a saved segment" : "+91 00000 00000"}
        />
        <Text style={st.label}>
          {campaign ? "Message template" : "Email (optional)"}
        </Text>
        <TextInput
          style={st.input}
          placeholder={
            campaign ? "Choose an approved template" : "name@company.com"
          }
        />
        <Pressable
          onPress={() => {
            Alert.alert(
              "Saved",
              campaign
                ? "Campaign saved as draft."
                : "Contact added successfully.",
            );
            navigation.goBack();
          }}
          style={st.primaryButton}
        >
          <Text style={st.primaryButtonText}>
            {campaign ? "Save campaign" : "Add contact"}
          </Text>
        </Pressable>
      </Card>
    </Screen>
  );
}
export function CampaignDetailsScreen({ route }: any) {
  const c = campaigns.find((x) => x.id === route.params.id) ?? campaigns[0];
  return (
    <Screen>
      <Card>
        <View style={st.between}>
          <View style={st.campaignIcon}>
            <Target color={colors.primaryDark} />
          </View>
          <StatusBadge label={c.status} />
        </View>
        <Text style={[st.hero, { fontSize: 23, marginTop: 16 }]}>{c.name}</Text>
        <Text style={st.subhero}>{c.total.toLocaleString()} recipients</Text>
        <View style={st.progressTrack}>
          <View
            style={[st.progressFill, { width: `${(c.sent / c.total) * 100}%` }]}
          />
        </View>
      </Card>
      <View style={st.metricGrid}>
        <MetricCard
          label="Messages sent"
          value={c.sent.toLocaleString()}
          change="Campaign total"
          icon={<Send color={colors.primary} size={20} />}
        />
        <MetricCard
          label="Read rate"
          value={`${c.read}%`}
          change="Healthy performance"
          icon={<CheckCheck color={colors.info} size={20} />}
        />
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  auth: { justifyContent: "center", paddingHorizontal: 20, gap: 28 },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { fontSize: 27, fontWeight: "800", color: colors.textPrimary },
  hero: {
    fontSize: 29,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
  },
  subhero: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 7,
  },
  authCard: { gap: 9, maxWidth: 480, width: "100%", alignSelf: "center" },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 5,
  },
  input: {
    height: 49,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  password: {
    height: 49,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: { flex: 1, fontSize: 15 },
  show: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },
  authLinks: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  remember: { fontSize: 13, color: colors.textSecondary },
  primaryButton: {
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryButtonText: { color: "white", fontSize: 15, fontWeight: "800" },
  legal: { fontSize: 11, color: colors.textMuted, textAlign: "center" },
  greeting: { fontSize: 23, fontWeight: "800", color: colors.textPrimary },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  columns: { flexDirection: "row", gap: 20, alignItems: "flex-start" },
  column: { flex: 1, minWidth: 280, gap: 8 },
  listCard: { paddingVertical: 0 },
  campaignHero: { flexDirection: "row", alignItems: "center", gap: 12 },
  campaignIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  muted: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  progressTrack: {
    height: 7,
    borderRadius: 5,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
    marginTop: 18,
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 17,
  },
  miniValue: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  miniLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
  quickGrid: { flexDirection: "row", gap: 10 },
  quick: {
    flex: 1,
    minHeight: 85,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickText: { fontSize: 12, fontWeight: "600", color: colors.textPrimary },
  conversation: { flexDirection: "row", gap: 12, paddingVertical: 13 },
  conversationBody: { flex: 1, gap: 6 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  time: { fontSize: 11, color: colors.textMuted },
  preview: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  unread: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: { fontSize: 11, fontWeight: "800", color: "white" },
  rowGap: { flexDirection: "row", alignItems: "center", gap: 7 },
  listScreen: { paddingBottom: 0, gap: 14 },
  flatList: { gap: 10, paddingBottom: 90 },
  conversationCard: { paddingVertical: 0 },
  chat: { flex: 1, backgroundColor: "#F2F6F4" },
  chatSafeHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  contactHeader: {
    height: 62,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  online: { fontSize: 11, color: colors.success, marginTop: 2 },
  messages: { padding: 16, gap: 12 },
  messageIn: {
    alignSelf: "flex-start",
    maxWidth: "82%",
    backgroundColor: "white",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    ...shadow,
  },
  messageOut: {
    alignSelf: "flex-end",
    maxWidth: "82%",
    backgroundColor: "#DDF8E9",
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 12,
  },
  messageText: { fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  messageTime: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 5,
    alignSelf: "flex-end",
  },
  sentMeta: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  datePill: {
    alignSelf: "center",
    fontSize: 11,
    color: colors.textSecondary,
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 8,
  },
  composer: {
    minHeight: 64,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 6,
  },
  composerInput: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    margin: 1,
  },
  contactCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  overview: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  overviewValue: {
    fontSize: 21,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 5,
  },
  overviewDivider: { width: 1, height: 44, backgroundColor: colors.border },
  moduleHero: { alignItems: "center", paddingVertical: 16 },
  moduleIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  greetingShell: { borderRadius: 22, overflow: "hidden", ...shadow },
  greetingGradient: {
    minHeight: 174,
    padding: 22,
    justifyContent: "center",
    overflow: "hidden",
  },
  greetingContent: { zIndex: 2, maxWidth: 430 },
  greetingLight: { fontSize: 25, fontWeight: "800", color: "white" },
  subGreeting: {
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.82)",
    marginTop: 7,
  },
  livePill: {
    alignSelf: "flex-start",
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#B9FFD8" },
  liveText: { fontSize: 11, fontWeight: "700", color: "white" },
  waveOne: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 35,
    borderColor: "rgba(255,255,255,0.09)",
    right: -85,
    top: -118,
  },
  waveTwo: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 22,
    borderColor: "rgba(255,255,255,0.07)",
    right: -35,
    bottom: -140,
  },
  glossOrb: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.08)",
    right: 38,
    top: -70,
  },
  profile: { alignItems: "center", gap: 7, paddingVertical: 10 },
});
