import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Bell,
  CalendarCheck,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  FileText,
  HelpCircle,
  Lock,
  LogOut,
  Megaphone,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Pause,
  Play,
  Plus,
  Send,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import {
  Badge,
  BrandHeader,
  Heading,
  Page,
  Photo,
  Pill,
  SearchBox,
  Surface,
} from "./figmaComponents";
import { ui, uiShadow } from "./figmaTheme";
import { useAppStore } from "./store";

export function FigmaLogin() {
  const login = useAppStore((x) => x.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [forgot, setForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const validEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());
  const changeEmail = (value: string) => {
    setEmail(value);
    setResetSent(false);
    if (errors.email)
      setErrors((current) => ({ ...current, email: undefined }));
  };
  const changePassword = (value: string) => {
    setPassword(value);
    if (errors.password)
      setErrors((current) => ({ ...current, password: undefined }));
  };
  const submit = () => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Email address is required.";
    else if (!validEmail(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 8)
      next.password = "Password must contain at least 8 characters.";
    setErrors(next);
    if (!Object.keys(next).length) login();
  };
  const sendReset = () => {
    if (!email.trim()) {
      setErrors({ email: "Email address is required." });
      return;
    }
    if (!validEmail(email)) {
      setErrors({ email: "Enter a valid email address." });
      return;
    }
    setErrors({});
    setResetSent(true);
  };
  return (
    <KeyboardAvoidingView
      style={s.login}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={s.loginSafe} edges={["top", "bottom"]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.loginScroll}
        >
          <View style={s.loginBrand}>
            <Image
              source={require("../assets/brand/logo-primary.png")}
              resizeMode="contain"
              style={s.loginLogo}
            />
          </View>
          <View style={s.loginIntro}>
            <Text style={s.welcome}>
              {forgot ? "Reset your password" : "Welcome back"}
            </Text>
            <Text style={s.secure}>
              {forgot
                ? "We’ll send a secure reset link to your inbox."
                : "Sign in to continue to your workspace."}
            </Text>
          </View>
          <Surface style={s.loginCard}>
            {resetSent && (
              <View style={s.resetSuccess}>
                <MaterialCommunityIcons
                  name="email-check-outline"
                  size={21}
                  color="#08783F"
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.resetSuccessTitle}>Check your inbox</Text>
                  <Text style={s.resetSuccessText}>
                    A password reset link was sent to {email.trim()}.
                  </Text>
                </View>
              </View>
            )}
            <Text style={s.fieldLabel}>Email address</Text>
            <View style={[s.authInput, errors.email && s.authInputError]}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={errors.email ? ui.danger : ui.muted}
              />
              <TextInput
                value={email}
                onChangeText={changeEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
                placeholder="name@company.com"
                placeholderTextColor={ui.muted}
                style={s.authInputText}
                returnKeyType={forgot ? "send" : "next"}
                onSubmitEditing={forgot ? sendReset : undefined}
              />
            </View>
            {errors.email && <Text style={s.fieldError}>{errors.email}</Text>}
            {!forgot && (
              <>
                <Text style={[s.fieldLabel, s.passwordLabel]}>Password</Text>
                <View
                  style={[s.authInput, errors.password && s.authInputError]}
                >
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={20}
                    color={errors.password ? ui.danger : ui.muted}
                  />
                  <TextInput
                    value={password}
                    onChangeText={changePassword}
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    autoComplete="password"
                    placeholder="Enter your password"
                    placeholderTextColor={ui.muted}
                    style={s.authInputText}
                    returnKeyType="done"
                    onSubmitEditing={submit}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onPress={() => setShowPassword((value) => !value)}
                    hitSlop={10}
                  >
                    <MaterialCommunityIcons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={21}
                      color={ui.body}
                    />
                  </Pressable>
                </View>
                {errors.password && (
                  <Text style={s.fieldError}>{errors.password}</Text>
                )}
                <View style={s.loginOptions}>
                  <Pressable
                    onPress={() => setRemember((value) => !value)}
                    style={s.rememberRow}
                  >
                    <View style={[s.checkbox, remember && s.checkboxChecked]}>
                      {remember && (
                        <MaterialCommunityIcons
                          name="check"
                          size={14}
                          color="white"
                        />
                      )}
                    </View>
                    <Text style={s.rememberText}>Remember me</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setForgot(true);
                      setErrors({});
                      setResetSent(false);
                    }}
                    hitSlop={8}
                  >
                    <Text style={s.forgotLink}>Forgot password?</Text>
                  </Pressable>
                </View>
              </>
            )}
            <Pressable
              onPress={forgot ? sendReset : submit}
              style={({ pressed }) => [
                s.loginButton,
                pressed && s.loginButtonPressed,
              ]}
            >
              <Text style={s.loginButtonText}>
                {forgot ? "Send reset link" : "Sign in"}
              </Text>
              <MaterialCommunityIcons
                name={forgot ? "email-fast-outline" : "arrow-right"}
                size={20}
                color="white"
              />
            </Pressable>
            {forgot && (
              <Pressable
                onPress={() => {
                  setForgot(false);
                  setErrors({});
                  setResetSent(false);
                }}
                style={s.backToLogin}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={18}
                  color={ui.purple}
                />
                <Text style={s.backToLoginText}>Back to sign in</Text>
              </Pressable>
            )}
          </Surface>
          <View style={s.securityNote}>
            <Shield size={15} color={ui.purple2} />
            <Text style={s.enterpriseText}>ENTERPRISE-GRADE SECURITY</Text>
          </View>
          <Text style={s.terms}>
            By continuing, you agree to KshanaAPI's{" "}
            <Text style={s.termsLink}>Terms of Service</Text> and{" "}
            <Text style={s.termsLink}>Privacy Policy</Text>.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const StatCard = ({ urgent = false }: { urgent?: boolean }) => (
  <Surface style={s.bigStat}>
    <View style={s.statTop}>
      {urgent ? (
        <CircleAlert size={20} color={ui.danger} />
      ) : (
        <MessageSquare size={20} color={ui.purple} />
      )}
      <View
        style={[
          s.smallPill,
          { backgroundColor: urgent ? "#FDE8E8" : "#F0E7FA" },
        ]}
      >
        <Text style={{ fontSize: 11, color: urgent ? ui.danger : ui.purple }}>
          {urgent ? "SLA Risk" : "+2 new"}
        </Text>
      </View>
    </View>
    <Text style={[s.statNumber, urgent && { color: ui.danger }]}>
      {urgent ? "3" : "12"}
    </Text>
    <Text style={s.statLabel}>{urgent ? "URGENT" : "MY OPEN\nCHATS"}</Text>
  </Surface>
);
const UrgentRow = ({ second = false }: { second?: boolean }) => (
  <Surface style={s.urgentRow}>
    <View
      style={[s.initials, { backgroundColor: second ? "#FFDBC9" : "#CEB5FF" }]}
    >
      <Text style={[s.initialText, { color: second ? "#763300" : "#584384" }]}>
        {second ? "ML" : "JS"}
      </Text>
      <View style={s.redDot} />
    </View>
    <View style={{ flex: 1 }}>
      <View style={s.rowBetween}>
        <Text style={s.rowName}>{second ? "Maria Lopez" : "James Smith"}</Text>
        <Badge text={second ? "15M AGO" : "2M AGO"} tone="red" />
      </View>
      <Text numberOfLines={2} style={s.rowPreview}>
        {second
          ? '"Urgent: Need to cancel my upcoming subscription before renewal..."'
          : '"Payment link isn’t working for the premium tier upgrade..."'}
      </Text>
    </View>
  </Surface>
);
export function FigmaHome({ navigation }: any) {
  return (
    <>
      <BrandHeader onAvatar={() => navigation.getParent()?.openDrawer()} />
      <Page>
        <Animated.View entering={FadeInDown.duration(350)} style={{ gap: 16 }}>
          <Heading>Today's Overview</Heading>
          <View style={s.twoCols}>
            <StatCard />
            <StatCard urgent />
          </View>
        </Animated.View>
        <View style={{ gap: 16 }}>
          <Heading
            action={
              <Pressable onPress={() => navigation.navigate("Inbox")}>
                <Text style={s.action}>View All →</Text>
              </Pressable>
            }
          >
            Recent Urgent
          </Heading>
          <UrgentRow />
          <UrgentRow second />
        </View>
        <View style={{ gap: 16 }}>
          <Heading>Campaign Summary</Heading>
          <View style={s.twoCols}>
            <SummaryCard
              title="Delivered"
              value="8.4k"
              growth="↑ 12%"
              progress={0.85}
            />
            <SummaryCard
              title="Read %"
              value="64.2%"
              growth="↑ 3%"
              progress={0.64}
            />
          </View>
        </View>
        <View style={s.insight}>
          <Text style={s.insightTitle}>Performance Insights</Text>
          <Text style={s.insightSub}>
            Peak activity detected at 2 PM today.
          </Text>
          <View style={s.chartShape} />
          <Pressable style={s.optimize}>
            <Text style={s.optimizeText}>Optimize Flows</Text>
          </Pressable>
        </View>
      </Page>
      <Pressable style={s.fab} onPress={() => navigation.navigate("Inbox")}>
        <MessageSquare color="white" size={22} />
      </Pressable>
    </>
  );
}
const SummaryCard = ({
  title,
  value,
  growth,
  progress,
}: {
  title: string;
  value: string;
  growth: string;
  progress: number;
}) => (
  <View style={s.summary}>
    <View style={s.summaryTitle}>
      <Send size={16} color={ui.purple} />
      <Text style={s.summaryLabel}>{title}</Text>
    </View>
    <View style={s.baseline}>
      <Text style={s.summaryValue}>{value}</Text>
      <Text style={s.growth}>{growth}</Text>
    </View>
    <View style={s.track}>
      <View style={[s.fill, { width: `${progress * 100}%` }]} />
    </View>
  </View>
);

const inboxData = [
  {
    id: "1",
    name: "Marcus Aurelius",
    phone: "+44 7700 900123",
    time: "10:45 AM",
    msg: "Can you confirm if the shipment for the",
    tag: "URGENT",
    tone: "red",
    img: require("../assets/figma/contact-marcus.png"),
  },
  {
    id: "2",
    name: "Sarah Jenkins",
    phone: "+1 202 555 0198",
    time: "09:12 AM",
    msg: "The documentation seems to have a...",
    tag: "WAITING",
    tone: "orange",
  },
  {
    id: "3",
    name: "Li Wei",
    phone: "+86 10 6512 3456",
    time: "Yesterday",
    msg: "Thanks for the update! Looking forward",
    tag: "RESOLVED",
    tone: "outline",
    img: require("../assets/figma/contact-li.png"),
  },
  {
    id: "4",
    name: "James Wilson",
    phone: "+61 2 9876 5432",
    time: "Oct 24",
    msg: "Internal: Checking credit limit before approving API upgrade.",
    tag: "WAITING",
    tone: "orange",
    img: require("../assets/figma/contact-james.png"),
  },
];
export function FigmaInbox({ navigation }: any) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return inboxData.filter(
      (x) =>
        `${x.name} ${x.phone} ${x.msg} ${x.tag}`
          .toLowerCase()
          .includes(needle) &&
        (filter === "All" ||
          filter === "Mine" ||
          filter === x.tag[0] + x.tag.slice(1).toLowerCase() ||
          (filter === "Unread" && x.id === "1")),
    );
  }, [query, filter]);
  return (
    <>
      <BrandHeader onAvatar={() => navigation.getParent()?.openDrawer()} />
      <View style={s.inboxPage}>
        <View style={s.sticky}>
          <SearchBox value={query} onChangeText={setQuery} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterRow}
          >
            {["All", "Mine", "Unread", "Urgent", "Waiting"].map((x) => (
              <Pill
                key={x}
                text={x}
                active={filter === x}
                dot={
                  x === "Urgent"
                    ? ui.danger
                    : x === "Waiting"
                      ? "#572400"
                      : undefined
                }
                onPress={() => setFilter(x)}
              />
            ))}
          </ScrollView>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.inboxList}
        >
          {shown.map((x, i) => (
            <Animated.View entering={FadeInRight.delay(i * 55)} key={x.id}>
              <Pressable
                onPress={() =>
                  navigation.navigate("Conversation", { id: x.id })
                }
              >
                <Surface style={s.inboxCard}>
                  <View>
                    {x.img ? (
                      <Photo source={x.img} />
                    ) : (
                      <View style={s.personPlaceholder}>
                        <Users size={18} color={ui.purple2} />
                      </View>
                    )}
                    {i === 0 && <View style={s.unreadDot} />}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={s.rowBetween}>
                      <Text style={s.rowName}>{x.name}</Text>
                      <Text style={s.time}>{x.time}</Text>
                    </View>
                    <Text style={s.phone}>{x.phone}</Text>
                    {i === 3 ? (
                      <View style={s.notePreview}>
                        <Text style={s.noteText}>{x.msg}</Text>
                      </View>
                    ) : (
                      <Text numberOfLines={1} style={s.messagePreview}>
                        {x.msg}
                      </Text>
                    )}
                    <View style={{ paddingTop: 5 }}>
                      <Badge text={x.tag} tone={x.tone as any} />
                    </View>
                  </View>
                </Surface>
              </Pressable>
            </Animated.View>
          ))}
          {shown.length === 0 && (
            <View style={s.inboxEmpty}>
              <MaterialCommunityIcons
                name="message-text-outline"
                size={42}
                color={ui.muted}
              />
              <Text style={s.rowName}>No conversations found</Text>
              <Text style={s.messagePreview}>
                Try another name, phone number, message, or filter.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
      <Pressable style={s.fab}>
        <MaterialCommunityIcons
          name="message-plus-outline"
          color="white"
          size={24}
        />
      </Pressable>
    </>
  );
}

type ChatAttachment = {
  uri: string;
  name: string;
  mimeType?: string;
  kind: "image" | "file";
};
export function FigmaConversation({ navigation }: any) {
  const [text, setText] = useState("");
  const [note, setNote] = useState(false);
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const chooseDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled) {
        const file = result.assets[0];
        setAttachment({
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType,
          kind: file.mimeType?.startsWith("image/") ? "image" : "file",
        });
      }
    } catch {
      Alert.alert(
        "Attachment unavailable",
        "The file could not be opened. Please try another file.",
      );
    }
  };
  const choosePhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo access needed",
          "Allow photo access in Settings to attach an image.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (!result.canceled) {
        const photo = result.assets[0];
        setAttachment({
          uri: photo.uri,
          name: photo.fileName || `photo-${Date.now()}.jpg`,
          mimeType: photo.mimeType,
          kind: "image",
        });
      }
    } catch {
      Alert.alert(
        "Photo unavailable",
        "The image could not be opened. Please try another image.",
      );
    }
  };
  const openAttachmentMenu = () =>
    Alert.alert("Add attachment", "Choose what you want to send.", [
      { text: "Photo library", onPress: choosePhoto },
      { text: "Document", onPress: chooseDocument },
      { text: "Cancel", style: "cancel" },
    ]);
  const sendMessage = () => {
    if (!text.trim() && !attachment) return;
    setText("");
    setAttachment(null);
  };
  return (
    <KeyboardAvoidingView
      style={s.chatPage}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView edges={["top"]} style={{ backgroundColor: ui.bg }}>
        <View style={s.chatHeader}>
          <Pressable
            accessibilityLabel="Back"
            onPress={navigation.goBack}
            style={s.touch}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={25}
              color={ui.purple}
            />
          </Pressable>
          <Photo
            source={require("../assets/figma/conversation-avatar.png")}
            size={40}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.chatName}>Alexander Thorne ✓</Text>
            <Text style={s.business}>WhatsApp Business</Text>
          </View>
          <Pressable accessibilityLabel="Conversation options" style={s.touch}>
            <MaterialCommunityIcons
              name="dots-vertical"
              size={24}
              color={ui.ink}
            />
          </Pressable>
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={s.chatMessages}>
        <Text style={s.dateChip}>TODAY</Text>
        <View style={s.bubbleIn}>
          <Text style={s.bubbleText}>
            Hello, I'm interested in the Q4 Enterprise API package. Could you
            provide a breakdown of the implementation timeline for a team of 50?
          </Text>
        </View>
        <Text style={s.bubbleMeta}>10:42 AM</Text>
        <View style={s.internalNote}>
          <View style={s.noteTitle}>
            <Lock size={14} color={ui.purple2} />
            <Text style={s.noteTitleText}>INTERNAL NOTE</Text>
          </View>
          <Text style={s.internalText}>
            User is a high-value lead from the October webinar. Check current
            capacity for Q4 onboarding before promising dates.
          </Text>
        </View>
        <View style={s.bubbleOut}>
          <Text style={s.bubbleOutText}>
            Hi Alexander! Absolutely. For a team of 50, we typically see a full
            rollout within 14 business days. I've attached our standard
            implementation roadmap for your review.
          </Text>
        </View>
        <Text style={[s.bubbleMeta, { alignSelf: "flex-end" }]}>
          10:45 AM ✓✓
        </Text>
        <Surface style={s.fileCard}>
          <View style={s.fileIcon}>
            <FileText color={ui.purple} size={22} />
          </View>
          <View>
            <Text style={s.rowName}>Requirements_v2.pdf</Text>
            <Text style={s.time}>2.4 MB</Text>
          </View>
        </Surface>
      </ScrollView>
      <SafeAreaView edges={["bottom"]} style={s.composerWrap}>
        <View style={s.modeRow}>
          <Text style={s.modeLabel}>Messaging Customer</Text>
          <View style={s.modeRight}>
            <Switch
              value={note}
              onValueChange={setNote}
              trackColor={{ true: ui.purple2, false: "#EDE5F3" }}
            />
            <Text style={s.modeLabel}>Note Mode</Text>
          </View>
        </View>
        {attachment && (
          <View style={s.attachmentPreview}>
            {attachment.kind === "image" ? (
              <Image
                source={{ uri: attachment.uri }}
                style={s.attachmentImage}
              />
            ) : (
              <View style={s.attachmentFileIcon}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={22}
                  color={ui.purple}
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={s.attachmentName}>
                {attachment.name}
              </Text>
              <Text style={s.attachmentType}>
                {attachment.kind === "image" ? "Photo" : "Document"} ready to
                send
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Remove attachment"
              onPress={() => setAttachment(null)}
              style={s.attachmentRemove}
            >
              <MaterialCommunityIcons name="close" size={20} color={ui.body} />
            </Pressable>
          </View>
        )}
        <View style={s.composer}>
          <Pressable
            accessibilityLabel="Add attachment"
            onPress={openAttachmentMenu}
            style={s.touch}
          >
            <MaterialCommunityIcons
              name="paperclip"
              size={25}
              color={ui.body}
            />
          </Pressable>
          <View style={s.composerInput}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={
                note ? "Write an internal note..." : "Type a message..."
              }
              placeholderTextColor={ui.muted}
              style={{ flex: 1, fontSize: 15, color: ui.ink }}
            />
            <MaterialCommunityIcons name="creation" size={19} color={ui.body} />
          </View>
          <Pressable
            accessibilityLabel="Send message"
            disabled={!text.trim() && !attachment}
            style={[
              s.sendButton,
              !text.trim() && !attachment && s.sendDisabled,
            ]}
            onPress={sendMessage}
          >
            <MaterialCommunityIcons name="send" size={21} color="white" />
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

export function FigmaAlerts() {
  return (
    <>
      <BrandHeader />
      <Page>
        <View style={{ gap: 16 }}>
          <Heading action={<Text style={s.markRead}>Mark all as read</Text>}>
            Today
          </Heading>
          <AlertCard
            type="error"
            title="Send failure alert"
            body={
              'API Endpoint failed to deliver 12 messages in "Spring Launch" batch.'
            }
          />
          <AlertCard
            type="message"
            title="New message from Sarah Jenkins"
            body={
              '"Can we finalize the campaign budget by EOD today? The team is waiting."'
            }
          />
          <AlertCard
            type="mention"
            title="Mentioned in Ops-Central"
            body="@Alex suggested checking the throughput for the latest WhatsApp template update."
          />
        </View>
        <View style={{ gap: 12 }}>
          <Heading>Earlier</Heading>
          <AlertCard
            type="campaign"
            title={'Campaign "Summer-Ref-24" completed'}
            body="Successfully delivered to 45,000 recipients. Open rate: 12.4%."
          />
          <AlertCard
            type="system"
            title="System Update Scheduled"
            body="The core messaging API will undergo maintenance on Sunday, 2:00 AM UTC."
          />
        </View>
      </Page>
    </>
  );
}
const AlertCard = ({
  type,
  title,
  body,
}: {
  type: string;
  title: string;
  body: string;
}) => {
  const color =
    type === "error"
      ? ui.danger
      : type === "message"
        ? ui.purple
        : type === "mention"
          ? "#77558F"
          : "#6A35B2";
  const Icon =
    type === "error"
      ? CircleAlert
      : type === "message"
        ? MessageSquare
        : type === "mention"
          ? AtSign
          : type === "campaign"
            ? Megaphone
            : SlidersHorizontal;
  return (
    <Surface style={[s.alertCard, { borderLeftColor: color }]}>
      <View style={[s.alertIcon, { backgroundColor: color + "22" }]}>
        <Icon size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.alertTitle}>{title}</Text>
        <Text style={s.alertBody}>{body}</Text>
        {type === "error" && (
          <View style={s.alertActions}>
            <Pressable style={s.retry}>
              <Text style={s.retryText}>Retry Send</Text>
            </Pressable>
            <Pressable style={s.logs}>
              <Text>View Logs</Text>
            </Pressable>
          </View>
        )}
        {type === "message" && <Text style={s.reply}>↩ Reply Now</Text>}
        {type === "campaign" && (
          <View style={s.miniMetrics}>
            <View>
              <Text style={s.time}>Open Rate</Text>
              <Text style={s.purpleMetric}>12.4%</Text>
            </View>
            <View>
              <Text style={s.time}>Conversions</Text>
              <Text style={s.purpleMetric}>842</Text>
            </View>
          </View>
        )}
      </View>
    </Surface>
  );
};

export function FigmaCampaigns() {
  const [tab, setTab] = useState("Active");
  const [sheet, setSheet] = useState(false);
  return (
    <>
      <BrandHeader />
      <Page>
        <View>
          <Text style={s.pageTitle}>Campaign Overview</Text>
          <Text style={s.pageSub}>
            Monitor your broadcast performance in real-time.
          </Text>
        </View>
        <View style={s.segment}>
          {["Active", "Scheduled", "Completed"].map((x) => (
            <Pressable
              key={x}
              onPress={() => setTab(x)}
              style={[s.segmentButton, tab === x && s.segmentActive]}
            >
              <Text style={[s.segmentText, tab === x && { color: "white" }]}>
                {x}
              </Text>
            </Pressable>
          ))}
        </View>
        <CampaignCard
          title="Summer Launch 2024"
          status="Running"
          sent="12,402"
          delivered="11,920"
          read="8,432"
          replied="420"
          progress={0.961}
          onPress={() => setSheet(true)}
        />
        <CampaignCard
          title="Weekly Newsletter #42"
          status="Paused"
          sent="4,500"
          delivered="4,410"
          read="2,100"
          replied="98"
          progress={0.45}
          onPress={() => setSheet(true)}
        />
        <View style={s.featureCard}>
          <View style={s.rowBetween}>
            <View>
              <Text style={s.featureTitle}>Flash Sale Alert</Text>
              <Text style={s.featureSub}>VIP Tier Customers · ID: #CM-910</Text>
            </View>
            <Badge text="● High Priority" tone="outline" />
          </View>
          <Text style={s.conversion}>12.8%</Text>
          <Text style={s.featureSub}>REPLY CONVERSION</Text>
          <View style={[s.track, { backgroundColor: "#CFB4F8" }]}>
            <View
              style={[s.fill, { width: "82%", backgroundColor: "white" }]}
            />
          </View>
        </View>
        <Heading>Daily Performance</Heading>
        <View style={s.twoCols}>
          <View style={s.daily}>
            <Text style={s.trend}>↗</Text>
            <Text style={s.dailyValue}>88.4%</Text>
            <Text style={s.dailyLabel}>Avg. Read Rate</Text>
          </View>
          <View style={s.daily}>
            <Text style={[s.trend, { color: "#763300" }]}>◴</Text>
            <Text style={s.dailyValue}>1.2s</Text>
            <Text style={s.dailyLabel}>Delivery Latency</Text>
          </View>
        </View>
      </Page>
      <Pressable style={s.fab}>
        <Plus color="white" />
      </Pressable>
      {sheet && <CampaignSheet close={() => setSheet(false)} />}
    </>
  );
}
const CampaignCard = ({
  title,
  status,
  sent,
  delivered,
  read,
  replied,
  progress,
  onPress,
}: any) => (
  <Pressable onPress={onPress}>
    <Surface style={s.campaignCard}>
      <View style={s.rowBetween}>
        <View>
          <Text style={s.rowName}>{title}</Text>
          <Text style={s.time}>Global Reach · ID: #CM-895</Text>
        </View>
        <Badge
          text={`● ${status}`}
          tone={status === "Paused" ? "red" : "purple"}
        />
      </View>
      <View style={s.campaignStats}>
        <CampaignMetric label="Sent" value={sent} />
        <CampaignMetric label="Delivered" value={delivered} />
        <CampaignMetric label="Read" value={read} />
        <CampaignMetric label="Replied" value={replied} purple />
      </View>
      <View style={s.rowBetween}>
        <Text style={s.dailyLabel}>
          {status === "Paused" ? "Progress" : "Delivery Rate"}
        </Text>
        <Text style={s.dailyLabel}>{Math.round(progress * 1000) / 10}%</Text>
      </View>
      <View style={s.track}>
        <View
          style={[
            s.fill,
            {
              width: `${progress * 100}%`,
              backgroundColor: status === "Paused" ? ui.danger : ui.purple,
            },
          ]}
        />
      </View>
    </Surface>
  </Pressable>
);
const CampaignMetric = ({ label, value, purple }: any) => (
  <View style={{ width: "50%", marginTop: 15 }}>
    <Text style={s.time}>{label}</Text>
    <Text style={[s.metricValue, purple && { color: ui.purple2 }]}>
      {value}
    </Text>
  </View>
);
const CampaignSheet = ({ close }: { close: () => void }) => (
  <Modal visible transparent animationType="fade" onRequestClose={close}>
    <View style={s.sheetShade}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      <Animated.View entering={FadeInDown} style={s.sheet}>
        <View style={s.handle} />
        <View style={s.rowBetween}>
          <View>
            <Text style={s.sheetEyebrow}>✣ ACTIVE CAMPAIGN</Text>
            <Text style={s.sheetTitle}>Holiday Promo v2</Text>
          </View>
          <Pressable onPress={close} style={s.close}>
            <X color={ui.body} />
          </Pressable>
        </View>
        <SheetMetric
          icon={<Users color={ui.purple} />}
          label="Recipients"
          value="4,820"
        />
        <SheetMetric
          icon={<CheckCheck color={ui.purple} />}
          label="Delivered"
          value="98.2%"
        />
        <SheetMetric
          icon={<ArrowRight color={ui.warning} />}
          label="Click Rate"
          value="12.4%"
        />
        <Text style={s.viewSummary}>◉ View Recipients Summary</Text>
        <View style={s.sheetActions}>
          <Pressable style={s.pause}>
            <Pause color={ui.warning} size={18} />
            <Text style={s.pauseText}>Pause</Text>
          </Pressable>
          <Pressable style={s.approve}>
            <Text style={s.approveText}>✺ Approve</Text>
          </Pressable>
        </View>
        <Pressable style={s.resume}>
          <Play color="white" size={17} />
          <Text style={s.resumeText}>Resume Campaign</Text>
        </Pressable>
      </Animated.View>
    </View>
  </Modal>
);
const SheetMetric = ({ icon, label, value }: any) => (
  <View style={s.sheetMetric}>
    <View style={s.sheetMetricIcon}>{icon}</View>
    <Text style={s.sheetMetricLabel}>{label}</Text>
    <Text style={s.sheetMetricValue}>{value}</Text>
  </View>
);

export function FigmaProfile() {
  const logout = useAppStore((x) => x.logout);
  const [online, setOnline] = useState(true);
  return (
    <>
      <BrandHeader />
      <Page padded={false}>
        <View style={s.profileHero}>
          <View>
            <Image
              source={require("../assets/figma/profile.png")}
              style={s.profileImg}
            />
            <View style={s.profileCheck}>
              <CalendarCheck size={12} color="white" />
            </View>
          </View>
          <Text style={s.profileName}>Alexander Bennett</Text>
          <Text style={s.profileRole}>Team Lead • Operations</Text>
        </View>
        <View style={s.profileBody}>
          <Surface style={s.availability}>
            <View style={s.alertIcon}>
              <CalendarCheck color={ui.purple} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowName}>Availability Status</Text>
              <Text style={s.time}>Currently Online</Text>
            </View>
            <Switch
              value={online}
              onValueChange={setOnline}
              trackColor={{ true: ui.purple2, false: ui.line }}
            />
          </Surface>
          <Text style={s.settingsLabel}>ACCOUNT SETTINGS</Text>
          <Setting
            icon={<Bell color={ui.purple2} />}
            label="Notification Preferences"
          />
          <Setting icon={<Shield color={ui.purple2} />} label="Security" />
          <Setting
            icon={<HelpCircle color={ui.purple2} />}
            label="Help Center"
          />
          <Pressable onPress={logout}>
            <Surface style={s.setting}>
              <LogOut color={ui.danger} />
              <Text style={[s.settingText, { color: ui.danger }]}>Logout</Text>
            </Surface>
          </Pressable>
          <View style={s.version}>
            <Text style={s.versionText}>KshanaAPI v2.4.12-pro</Text>
            <Text style={s.versionText}>Operational Precision Framework</Text>
          </View>
        </View>
      </Page>
    </>
  );
}
const Setting = ({ icon, label }: any) => (
  <Surface style={s.setting}>
    {icon}
    <Text style={s.settingText}>{label}</Text>
    <ChevronRight color={ui.line} />
  </Surface>
);

const s = StyleSheet.create({
  login: { flex: 1, backgroundColor: "#F7F8FC" },
  loginSafe: { flex: 1 },
  loginScroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    justifyContent: "center",
  },
  loginBrand: {
    height: 68,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  loginLogo: { width: 210, height: 68 },
  loginIntro: { alignItems: "center", marginBottom: 22 },
  welcome: {
    fontSize: 28,
    lineHeight: 35,
    fontWeight: "800",
    color: ui.ink,
    textAlign: "center",
  },
  secure: {
    maxWidth: 330,
    fontSize: 14,
    lineHeight: 21,
    color: ui.body,
    marginTop: 6,
    textAlign: "center",
  },
  loginCard: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    padding: 22,
    borderRadius: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: ui.ink,
    marginBottom: 8,
  },
  passwordLabel: { marginTop: 18 },
  authInput: {
    height: 54,
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: 13,
    backgroundColor: "#FCFBFD",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  authInputError: { borderColor: ui.danger, backgroundColor: "#FFF9F9" },
  authInputText: { flex: 1, fontSize: 15, color: ui.ink, paddingVertical: 0 },
  fieldError: { fontSize: 12, color: ui.danger, marginTop: 6 },
  loginOptions: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rememberRow: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: ui.line,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: ui.purple, borderColor: ui.purple },
  rememberText: { fontSize: 13, color: ui.body },
  forgotLink: { fontSize: 13, fontWeight: "700", color: ui.purple },
  loginButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: ui.purple,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 20,
    shadowColor: ui.purple,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  loginButtonPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  loginButtonText: { fontSize: 16, fontWeight: "700", color: "white" },
  backToLogin: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 8,
  },
  backToLoginText: { fontSize: 14, fontWeight: "700", color: ui.purple },
  resetSuccess: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#E8F9F0",
    borderWidth: 1,
    borderColor: "#BDECD1",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 18,
  },
  resetSuccessTitle: { fontSize: 13, fontWeight: "700", color: "#08783F" },
  resetSuccessText: {
    fontSize: 12,
    lineHeight: 17,
    color: "#357054",
    marginTop: 2,
  },
  securityNote: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  enterpriseText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    color: ui.purple2,
  },
  terms: {
    maxWidth: 390,
    alignSelf: "center",
    fontSize: 11,
    lineHeight: 17,
    color: ui.muted,
    textAlign: "center",
    marginTop: 14,
  },
  termsLink: { color: ui.purple, fontWeight: "600" },
  twoCols: { flexDirection: "row", gap: 16 },
  bigStat: {
    flex: 1,
    height: 144,
    padding: 16,
    justifyContent: "space-between",
  },
  statTop: { flexDirection: "row", justifyContent: "space-between" },
  smallPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 14 },
  statNumber: { fontSize: 30, color: ui.ink },
  statLabel: {
    fontSize: 16,
    lineHeight: 24,
    color: "#685395",
    letterSpacing: 0.8,
  },
  action: { fontSize: 15, color: ui.purple },
  urgentRow: {
    minHeight: 96,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  initials: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  initialText: { fontWeight: "700", fontSize: 16 },
  redDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ui.danger,
    borderWidth: 2,
    borderColor: "white",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowName: { fontSize: 16, fontWeight: "600", color: ui.ink },
  rowPreview: { fontSize: 12, lineHeight: 18, color: "#685395", marginTop: 3 },
  summary: {
    flex: 1,
    backgroundColor: ui.purpleSurface,
    borderWidth: 1,
    borderColor: "rgba(204,195,215,.25)",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  summaryTitle: { flexDirection: "row", gap: 8, alignItems: "center" },
  summaryLabel: { fontSize: 16, color: "#584384" },
  baseline: { flexDirection: "row", alignItems: "baseline", gap: 7 },
  summaryValue: { fontSize: 24, fontWeight: "800", color: ui.ink },
  growth: { fontSize: 10, fontWeight: "700", color: ui.purple2 },
  track: {
    height: 4,
    borderRadius: 4,
    backgroundColor: ui.line,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: ui.purple },
  insight: {
    height: 160,
    borderRadius: 16,
    backgroundColor: ui.dark,
    padding: 24,
    overflow: "hidden",
  },
  insightTitle: { fontSize: 16, color: "#F6EEFB" },
  insightSub: { fontSize: 12, color: "#F6EEFB", opacity: 0.8, marginTop: 4 },
  optimize: {
    position: "absolute",
    left: 24,
    bottom: 24,
    backgroundColor: ui.purple,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  optimizeText: { color: "white", fontSize: 15 },
  chartShape: {
    position: "absolute",
    width: 150,
    height: 150,
    right: -35,
    bottom: -80,
    transform: [{ rotate: "45deg" }],
    backgroundColor: "#766F80",
    opacity: 0.6,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 78,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ui.purple,
    alignItems: "center",
    justifyContent: "center",
    ...uiShadow,
  },
  inboxPage: { flex: 1, backgroundColor: ui.bg },
  sticky: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterRow: { gap: 6, paddingRight: 16 },
  inboxList: { paddingHorizontal: 16, paddingBottom: 95, gap: 8 },
  inboxCard: { padding: 16, flexDirection: "row", gap: 16 },
  inboxEmpty: { alignItems: "center", paddingTop: 54, gap: 8 },
  personPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ui.purpleSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    right: -2,
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ui.purple,
    borderWidth: 2,
    borderColor: "white",
  },
  time: { fontSize: 12, color: ui.muted },
  phone: { fontSize: 16, color: ui.purple },
  messagePreview: { fontSize: 14, color: ui.body, marginTop: 2 },
  notePreview: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#B68ADF",
    backgroundColor: ui.purpleSurface,
    borderRadius: 8,
    padding: 9,
    marginTop: 3,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: "italic",
    color: ui.purple,
  },
  chatPage: { flex: 1, backgroundColor: ui.bg },
  chatHeader: {
    height: 56,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE7F2",
  },
  touch: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chatName: { fontSize: 16, fontWeight: "700", color: ui.ink },
  business: { fontSize: 12, color: "#685395", letterSpacing: 0.6 },
  chatMessages: { padding: 16, paddingBottom: 28 },
  dateChip: {
    alignSelf: "center",
    backgroundColor: "#EDE5F3",
    color: ui.body,
    fontSize: 11,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 24,
  },
  bubbleIn: {
    maxWidth: "88%",
    backgroundColor: "white",
    borderRadius: 0,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    padding: 14,
    ...uiShadow,
  },
  bubbleText: { fontSize: 16, lineHeight: 22, color: ui.ink },
  bubbleMeta: { fontSize: 10, color: "#685395", marginTop: 6 },
  internalNote: {
    margin: 24,
    marginHorizontal: 16,
    padding: 14,
    backgroundColor: ui.purpleSurface,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#BDA8CB",
    borderRadius: 14,
  },
  noteTitle: { flexDirection: "row", gap: 7, alignItems: "center" },
  noteTitleText: { fontSize: 11, color: "#685395", letterSpacing: 0.5 },
  internalText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: "italic",
    color: "#685395",
    marginTop: 8,
  },
  bubbleOut: {
    maxWidth: "88%",
    alignSelf: "flex-end",
    backgroundColor: ui.purple,
    borderRadius: 0,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    padding: 14,
  },
  bubbleOutText: { fontSize: 15, lineHeight: 22, color: "white" },
  fileCard: {
    alignSelf: "flex-start",
    padding: 9,
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 230,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: ui.purpleSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  composerWrap: {
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: ui.line,
  },
  modeRow: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE7F2",
  },
  modeRight: { flexDirection: "row", alignItems: "center" },
  modeLabel: { fontSize: 13, color: "#685395" },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 8,
  },
  composerInput: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: ui.purpleSoft,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ui.purple,
    alignItems: "center",
    justifyContent: "center",
    ...uiShadow,
  },
  sendDisabled: { opacity: 0.38 },
  attachmentPreview: {
    height: 64,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: ui.purpleSurface,
    borderWidth: 1,
    borderColor: ui.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
  },
  attachmentImage: { width: 46, height: 46, borderRadius: 8 },
  attachmentFileIcon: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: ui.white,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentName: { fontSize: 14, fontWeight: "700", color: ui.ink },
  attachmentType: { fontSize: 11, color: ui.body, marginTop: 3 },
  attachmentRemove: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  markRead: { fontSize: 12, fontWeight: "700", color: ui.purple },
  alertCard: { padding: 16, flexDirection: "row", gap: 14, borderLeftWidth: 4 },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ui.purpleSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  alertTitle: { fontSize: 16, fontWeight: "700", color: ui.ink },
  alertBody: { fontSize: 14, lineHeight: 20, color: ui.body, marginTop: 4 },
  alertActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  retry: {
    backgroundColor: ui.danger,
    borderRadius: 7,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: { color: "white", fontWeight: "600" },
  logs: {
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: 7,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  reply: { fontSize: 12, color: ui.purple, fontWeight: "700", marginTop: 8 },
  miniMetrics: {
    flexDirection: "row",
    gap: 44,
    backgroundColor: ui.purpleSurface,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  purpleMetric: { fontSize: 20, fontWeight: "700", color: ui.purple2 },
  pageTitle: { fontSize: 22, fontWeight: "700", color: ui.ink },
  pageSub: { fontSize: 12, color: ui.body, marginTop: 3 },
  segment: {
    height: 36,
    backgroundColor: ui.purpleSurface,
    borderRadius: 8,
    flexDirection: "row",
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  segmentActive: { backgroundColor: ui.purple2 },
  segmentText: { fontSize: 12, color: "#685395" },
  campaignCard: { padding: 16 },
  campaignStats: { flexDirection: "row", flexWrap: "wrap" },
  metricValue: { fontSize: 18, fontWeight: "700", color: ui.ink, marginTop: 2 },
  featureCard: {
    backgroundColor: "#6421C7",
    borderRadius: 10,
    padding: 16,
    ...uiShadow,
  },
  featureTitle: { fontSize: 16, color: "#DCCBFF" },
  featureSub: { fontSize: 10, color: "#CCB8F5" },
  conversion: {
    fontSize: 30,
    fontWeight: "700",
    color: "#DCCBFF",
    marginTop: 18,
  },
  daily: {
    flex: 1,
    height: 106,
    borderRadius: 12,
    backgroundColor: ui.purpleSurface,
    padding: 14,
    justifyContent: "space-between",
  },
  trend: { fontSize: 21, fontWeight: "700", color: ui.purple },
  dailyValue: { fontSize: 18, fontWeight: "700", color: ui.ink },
  dailyLabel: { fontSize: 11, fontWeight: "600", color: ui.body },
  sheetShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(29,26,35,.42)",
    justifyContent: "flex-end",
    zIndex: 20,
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 10,
    gap: 8,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5DFE9",
    alignSelf: "center",
    marginBottom: 3,
  },
  sheetEyebrow: {
    fontSize: 11,
    color: "#685395",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  sheetTitle: { fontSize: 24, fontWeight: "700", color: ui.ink, marginTop: 4 },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ui.purpleSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetMetric: {
    height: 64,
    borderRadius: 12,
    backgroundColor: ui.purpleSurface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
  },
  sheetMetricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetMetricLabel: { flex: 1, fontSize: 14, color: ui.body },
  sheetMetricValue: { fontSize: 17, fontWeight: "700", color: ui.ink },
  viewSummary: {
    fontSize: 12,
    fontWeight: "700",
    color: ui.purple,
    marginVertical: 6,
  },
  sheetActions: { flexDirection: "row", gap: 16 },
  pause: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#FFD6C5",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  pauseText: { fontSize: 16, fontWeight: "700", color: ui.warning },
  approve: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#6824C9",
    alignItems: "center",
    justifyContent: "center",
  },
  approveText: { fontSize: 16, fontWeight: "700", color: "#D2B5FF" },
  resume: {
    height: 56,
    borderRadius: 14,
    backgroundColor: ui.purple,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  resumeText: { color: "white", fontSize: 16, fontWeight: "700" },
  profileHero: {
    height: 216,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  profileImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: "#E8DCF0",
  },
  profileCheck: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ui.purple2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: ui.ink,
    marginTop: 14,
  },
  profileRole: { fontSize: 14, color: ui.body, marginTop: 3 },
  profileBody: { padding: 16, gap: 10 },
  availability: {
    height: 76,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  settingsLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.7,
    color: ui.body,
    marginTop: 14,
    marginLeft: 4,
  },
  setting: {
    height: 54,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  settingText: { flex: 1, fontSize: 15, color: ui.ink },
  version: { alignItems: "center", marginTop: 22 },
  versionText: { fontSize: 11, color: "#D1C7DA", lineHeight: 20 },
});
