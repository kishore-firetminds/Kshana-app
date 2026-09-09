import { ScrollView, KeyboardFrame } from "./KeyboardLayout";
import { Text, TextInput } from "./themedText";
import { WorkspaceScreen } from "./WorkspaceScreen";
import { workspaceUrl } from "./api/workspace";
import {
  notificationConversationId,
  notificationMessageId,
} from "./notificationRouting";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Switch,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { BrandHeader, Pill, SearchBox } from "./figmaComponents";
import { api, SITE_URL } from "./api";
import { MobilePreferences } from "./MobilePreferences";
import { errorMessage } from "./api/client";
import {
  Attachment,
  mediaLinks,
  mergeMessages,
  messageTimeline,
  messagePayload,
} from "./api/messaging";
import {
  Campaign,
  Contact,
  Conversation,
  Dashboard,
  Message,
  Notification,
  Paginated,
  Template,
  UploadedFile,
  can,
  canMutate,
  contactName,
  humanize,
} from "./api/types";
import { useAppStore } from "./store";
import { useResource } from "./useResource";
import {
  AccessNotice,
  Avatar,
  Button,
  Feedback,
  Field,
  ReadOnlyNotice,
  dateLabel,
  l,
  openUrl,
} from "./liveUi";
import { ui } from "./figmaTheme";
import { EmojiPicker } from "./EmojiPicker";

function PageHeader({ navigation }: { navigation: any }) {
  return (
    <BrandHeader
      onAvatar={() => {
        let parent = navigation;
        while (parent && !parent.openDrawer) parent = parent.getParent?.();
        parent?.openDrawer();
      }}
    />
  );
}
function Pager({
  page,
  totalPages,
  setPage,
}: {
  page: number;
  totalPages: number;
  setPage: (value: number) => void;
}) {
  return totalPages > 1 ? (
    <View style={l.between}>
      <Button
        title="Previous"
        disabled={page <= 1}
        secondary
        onPress={() => setPage(page - 1)}
      />
      <Text style={l.muted}>
        {page} / {totalPages}
      </Text>
      <Button
        title="Next"
        disabled={page >= totalPages}
        secondary
        onPress={() => setPage(page + 1)}
      />
    </View>
  ) : null;
}
function ConversationRow({
  conversation,
  onPress,
}: {
  conversation: Conversation;
  onPress: () => void;
}) {
  const name = contactName(conversation.contact);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open conversation with ${name}`}
      onPress={onPress}
      style={l.card}
    >
      <View style={l.row}>
        <Avatar name={name} uri={conversation.contact?.profilePhotoUrl} />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={l.between}>
            <Text style={[l.heading, { flex: 1 }]} numberOfLines={1}>
              {name}
            </Text>
            {Boolean(conversation.unreadCount) && (
              <Text style={l.badge}>{conversation.unreadCount} unread</Text>
            )}
          </View>
          <Text style={l.muted}>
            {conversation.contact?.whatsappNumber ||
              conversation.contact?.phone}
          </Text>
        </View>
      </View>
      <Text numberOfLines={2} style={l.body}>
        {conversation.lastMessagePreview || "No messages yet"}
      </Text>
      <View style={l.between}>
        <Text style={l.badge}>
          {humanize(conversation.status)}
          {conversation.priority === "URGENT" ? " · Urgent" : ""}
        </Text>
        <Text style={l.muted}>{dateLabel(conversation.lastMessageAt)}</Text>
      </View>
      {conversation.assignedTo && (
        <Text style={l.muted}>
          Assigned to {conversation.assignedTo.fullName}
        </Text>
      )}
    </Pressable>
  );
}
export function FigmaHome({ navigation }: any) {
  const user = useAppStore((s) => s.user);
  const resource = useResource<Dashboard>(
    can(user, "dashboard.read") ? "/dashboard/overview" : null,
    30000,
  );
  const overview = resource.data;
  return (
    <View style={l.page}>
      <PageHeader navigation={navigation} />
      <ScrollView
        contentContainerStyle={l.content}
        refreshControl={
          <RefreshControl
            refreshing={resource.loading}
            onRefresh={resource.refresh}
          />
        }
      >
        <Text style={l.title}>Hello, {user?.fullName.split(" ")[0]}</Text>
        <Text style={l.body}>{user?.organization?.name}</Text>
        <ReadOnlyNotice />
        {!can(user, "dashboard.read") ? (
          <AccessNotice />
        ) : (
          <>
            <Feedback {...resource} retry={resource.refresh} />
            {overview && (
              <>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}
                >
                  {[
                    ["Open conversations", overview.metrics.openConversations],
                    [
                      "Pending conversations",
                      overview.metrics.pendingConversations,
                    ],
                    ["Active leads", overview.metrics.activeLeads],
                    ["Follow-ups due", overview.metrics.followupsDue],
                  ].map(([label, value]) => (
                    <View key={label} style={[l.card, { width: "47%" }]}>
                      <Text style={[l.title, { color: ui.primary }]}>
                        {value ?? 0}
                      </Text>
                      <Text style={l.body}>{label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={l.heading}>Response queue</Text>
                {overview.responseQueue.length === 0 && (
                  <Text style={l.body}>No conversations need a response.</Text>
                )}
                {overview.responseQueue.map((conversation) => (
                  <ConversationRow
                    key={conversation.id}
                    conversation={conversation}
                    onPress={() =>
                      navigation.navigate("Inbox", {
                        screen: "Conversation",
                        params: { id: conversation.id },
                      })
                    }
                  />
                ))}
              </>
            )}
          </>
        )}
        <Button
          title="Open inbox"
          onPress={() => navigation.navigate("Inbox")}
        />
      </ScrollView>
    </View>
  );
}
export function FigmaInbox({ navigation }: any) {
  const user = useAppStore((s) => s.user);
  const allowed = can(user, "conversations.read.all", "conversations.read.own");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);
  const resource = useResource<Paginated<Conversation>>(
    allowed
      ? `/conversations?page=${page}&limit=30&search=${encodeURIComponent(search)}${status === "ALL" ? "" : `&status=${status}`}`
      : null,
    15000,
  );
  return (
    <View style={l.page}>
      <PageHeader navigation={navigation} />
      <ScrollView
        contentContainerStyle={l.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={resource.loading}
            onRefresh={resource.refresh}
          />
        }
      >
        <View style={l.between}>
          <Text style={l.title}>Inbox</Text>
          {canMutate(user, "conversations.send") &&
            can(user, "contacts.read") && (
              <Button
                title="New chat"
                secondary
                onPress={() => setCreating(true)}
              />
            )}
        </View>
        <ReadOnlyNotice />
        {!allowed ? (
          <AccessNotice />
        ) : (
          <>
            <SearchBox value={query} onChangeText={setQuery} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {["ALL", "OPEN", "PENDING", "RESOLVED", "CLOSED"].map((value) => (
                <Pill
                  key={value}
                  text={humanize(value)}
                  active={status === value}
                  onPress={() => {
                    setStatus(value);
                    setPage(1);
                  }}
                />
              ))}
            </ScrollView>
            <Feedback
              {...resource}
              retry={resource.refresh}
              empty={
                resource.data?.items.length === 0 &&
                "No conversations match this search."
              }
            />
            {resource.data?.items.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                onPress={() =>
                  navigation.navigate("Conversation", { id: conversation.id })
                }
              />
            ))}
            {resource.data && (
              <Pager
                page={page}
                totalPages={resource.data.meta.totalPages}
                setPage={setPage}
              />
            )}
          </>
        )}
      </ScrollView>
      <Modal
        visible={creating}
        animationType="slide"
        onRequestClose={() => setCreating(false)}
      >
        {creating && (
          <NewConversation
            onClose={() => setCreating(false)}
            onCreated={(id) => {
              setCreating(false);
              navigation.navigate("Conversation", { id });
            }}
          />
        )}
      </Modal>
    </View>
  );
}
function NewConversation({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const contacts = useResource<Paginated<Contact>>(
    `/contacts?page=${page}&limit=20&search=${encodeURIComponent(search)}`,
  );
  const create = async (contact: Contact) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const result = await api.post<Conversation>("/conversations", {
        channelType: "WHATSAPP",
        contactId: contact.id,
      });
      onCreated(result.id);
    } catch (error) {
      Alert.alert("Could not open chat", errorMessage(error));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={l.page}>
      <ScrollView
        contentContainerStyle={l.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={l.between}>
          <Text style={l.title}>New conversation</Text>
          <Button title="Close" secondary onPress={onClose} disabled={busy} />
        </View>
        <SearchBox
          value={search}
          onChangeText={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
        <Feedback
          {...contacts}
          retry={contacts.refresh}
          empty={contacts.data?.items.length === 0 && "No contacts found."}
        />
        {contacts.data?.items.map((contact) => (
          <Pressable
            key={contact.id}
            style={l.card}
            disabled={busy || !contact.whatsappNumber}
            onPress={() => create(contact)}
          >
            <Text style={l.heading}>{contactName(contact)}</Text>
            <Text style={l.body}>
              {contact.whatsappNumber || "No WhatsApp phone number"}
            </Text>
          </Pressable>
        ))}
        {contacts.data && (
          <Pager
            page={page}
            totalPages={contacts.data.meta.totalPages}
            setPage={setPage}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function FigmaConversation({ navigation, route }: any) {
  const id: string = route.params.id;
  const user = useAppStore((s) => s.user);
  const resource = useResource<Conversation>(
    `/conversations/${encodeURIComponent(id)}`,
    8000,
  );
  const conversation = resource.data;
  const [text, setText] = useState("");
  const [note, setNote] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [older, setOlder] = useState<Message[]>([]);
  const [olderPage, setOlderPage] = useState(1);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const scrollToBottom = useRef(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<Message | null>(null);
  const [targetId, setTargetId] = useState<string | undefined>(
    route.params.messageId,
  );
  const [targetError, setTargetError] = useState<string | null>(null);
  const targetPending = useRef(Boolean(route.params.messageId));
  const positions = useRef(new Map<string, number>());
  const dragging = useRef(false);
  const selection = useRef({ start: 0, end: 0 });
  const currentId = useRef(id);
  currentId.current = id;
  const alignMessages = () => {
    if (targetPending.current && targetId) {
      const y = positions.current.get(
        timeline.reactionTargets.get(targetId) || targetId,
      );
      if (y !== undefined) {
        scroll.current?.scrollTo({ y: Math.max(0, y - 24), animated: false });
        targetPending.current = false;
        scrollToBottom.current = false;
      }
    } else if (scrollToBottom.current)
      scroll.current?.scrollToEnd({ animated: false });
  };
  useEffect(() => {
    setTargetId(route.params.messageId);
    targetPending.current = Boolean(route.params.messageId);
    scrollToBottom.current = !route.params.messageId;
    setTargetError(null);
  }, [id, route.params.messageId]);
  useEffect(() => {
    setText("");
    setAttachment(null);
    setFailure(null);
    setOlder([]);
    setOlderPage(1);
    scrollToBottom.current = !route.params.messageId;
    positions.current.clear();
    dragging.current = false;
    setReplyingTo(null);
    setReactionTarget(null);
    setEmojiOpen(false);
  }, [id]);
  const messages = mergeMessages(older, conversation?.messages || []);
  const timeline = messageTimeline(messages);
  const optedOut =
    conversation?.channelType === "WHATSAPP" &&
    conversation.contact?.whatsappConsentStatus === "OPTED_OUT";
  const writable =
    (!optedOut || note) &&
    canMutate(
      user,
      note ? "conversations.internal_note" : "conversations.send",
    );
  const loadOlder = async () => {
    if (loadingOlder) return;
    setLoadingOlder(true);
    try {
      const result = await api.get<Paginated<Message>>(
        `/conversations/${encodeURIComponent(id)}/messages?page=${olderPage + 1}&limit=50`,
      );
      if (currentId.current !== id) return;
      setOlder((previous) => mergeMessages(previous, result.items));
      setOlderPage((previous) => previous + 1);
    } catch (error) {
      if (targetPending.current) {
        targetPending.current = false;
        setTargetError("Could not load the linked message. Tap Retry.");
      } else
        Alert.alert("Could not load earlier messages", errorMessage(error));
    } finally {
      setLoadingOlder(false);
    }
  };
  useEffect(() => {
    if (
      !conversation ||
      !targetPending.current ||
      !targetId ||
      loadingOlder ||
      targetError
    )
      return;
    if (messages.some((message) => message.id === targetId)) {
      requestAnimationFrame(alignMessages);
    } else if (olderPage < (conversation.messagesMeta?.totalPages || 1)) {
      void loadOlder();
    } else {
      targetPending.current = false;
      setTargetError(
        "This message is no longer available. Showing the latest messages.",
      );
      scrollToBottom.current = true;
      requestAnimationFrame(alignMessages);
    }
  }, [conversation, targetId, olderPage, loadingOlder, targetError]);
  const jumpToMessage = (messageId: string) => {
    setTargetError(null);
    setTargetId(messageId);
    targetPending.current = true;
    scrollToBottom.current = false;
    const y = positions.current.get(messageId);
    if (y !== undefined) {
      scroll.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
      targetPending.current = false;
    }
  };
  const reactToMessage = async (emoji: string) => {
    if (!reactionTarget || lock.current || !writable || note) return;
    lock.current = true;
    setBusy(true);
    try {
      const sent = await api.post<Message>(
        `/conversations/${encodeURIComponent(id)}/messages/${encodeURIComponent(reactionTarget.id)}/reaction`,
        { emoji },
      );
      if (currentId.current !== id) return;
      setOlder((previous) => mergeMessages(previous, [sent]));
      setReactionTarget(null);
      void resource.refresh();
    } catch (error) {
      Alert.alert("Could not send reaction", errorMessage(error));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
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
          mimeType: file.mimeType || "application/octet-stream",
          size: file.size,
        });
      }
    } catch (error) {
      Alert.alert("Attachment unavailable", errorMessage(error));
    }
  };
  const choosePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (!result.canceled) {
        const photo = result.assets[0];
        setAttachment({
          uri: photo.uri,
          name: photo.fileName || `photo-${Date.now()}.jpg`,
          mimeType: photo.mimeType || "image/jpeg",
          size: photo.fileSize,
        });
      }
    } catch (error) {
      Alert.alert("Photo unavailable", errorMessage(error));
    }
  };
  const send = async () => {
    if (lock.current || !writable || (!text.trim() && !attachment)) return;
    lock.current = true;
    setBusy(true);
    setFailure(null);
    try {
      let file = attachment?.uploaded;
      if (attachment && !file) {
        const form = new FormData();
        form.append("file", {
          uri: attachment.uri,
          name: attachment.name,
          type: attachment.mimeType,
        } as unknown as Blob);
        file = await api.request<UploadedFile>("/files/upload", {
          method: "POST",
          data: form,
          headers: { "Content-Type": "multipart/form-data" },
        });
        setAttachment({ ...attachment, uploaded: file });
      }
      const sent = await api.post<Message>(
        `/conversations/${encodeURIComponent(id)}/${note ? "internal-note" : "messages"}`,
        messagePayload(text, note, file, replyingTo?.id),
      );
      if (currentId.current !== id) return;
      targetPending.current = false;
      setReplyingTo(null);
      setOlder((previous) => mergeMessages(previous, [sent]));
      setText("");
      setAttachment(null);
      dragging.current = false;
      scrollToBottom.current = true;
      void resource.refresh();
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const name = contactName(conversation?.contact);
  return (
    <KeyboardFrame style={l.page}>
      <SafeAreaView edges={["top"]}>
        <View style={[l.row, { padding: 12 }]}>
          <Pressable
            accessibilityLabel="Back to inbox"
            onPress={() => navigation.goBack()}
            style={{ padding: 8 }}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={ui.primary}
            />
          </Pressable>
          <Avatar name={name} uri={conversation?.contact?.profilePhotoUrl} />
          <View style={{ flex: 1 }}>
            <Text style={l.heading} numberOfLines={1}>
              {conversation ? name : "Conversation"}
            </Text>
            <Text style={l.muted}>
              {conversation
                ? `${humanize(conversation.channelType)} · ${humanize(conversation.status)}`
                : "Loading…"}
            </Text>
          </View>
          <Pressable
            disabled={!conversation}
            accessibilityLabel="Conversation options"
            style={{ padding: 8 }}
            onPress={() => setOptionsOpen(true)}
          >
            <MaterialCommunityIcons
              name="dots-vertical"
              size={24}
              color={ui.primary}
            />
          </Pressable>
        </View>
      </SafeAreaView>
      <ScrollView
        keyboardAvoidance={false}
        ref={scroll}
        contentContainerStyle={l.content}
        keyboardShouldPersistTaps="handled"
        onLayout={() => requestAnimationFrame(alignMessages)}
        maintainVisibleContentPosition={
          dragging.current && !scrollToBottom.current && !targetPending.current
            ? { minIndexForVisible: 1 }
            : undefined
        }
        onScrollBeginDrag={() => {
          dragging.current = true;
          targetPending.current = false;
        }}
        onScroll={(event) => {
          if (!dragging.current) return;
          const { contentOffset, contentSize, layoutMeasurement } =
            event.nativeEvent;
          scrollToBottom.current =
            contentSize.height - contentOffset.y - layoutMeasurement.height <
            100;
        }}
        scrollEventThrottle={100}
        onContentSizeChange={alignMessages}
        refreshControl={
          <RefreshControl
            refreshing={resource.loading && !conversation}
            onRefresh={resource.refresh}
          />
        }
      >
        <Feedback
          loading={!conversation && resource.loading}
          error={resource.error}
          retry={resource.refresh}
          empty={
            Boolean(conversation) &&
            messages.length === 0 &&
            "No messages yet. Start the conversation below."
          }
        />
        {conversation?.messagesMeta &&
          olderPage < conversation.messagesMeta.totalPages && (
            <Button
              title={loadingOlder ? "Loading…" : "Load earlier messages"}
              secondary
              disabled={loadingOlder}
              onPress={loadOlder}
            />
          )}
        {targetError && (
          <View>
            <Text style={l.muted}>{targetError}</Text>
            <Button
              title="Retry linked message"
              secondary
              onPress={() => {
                setTargetError(null);
                targetPending.current = true;
              }}
            />
          </View>
        )}
        {timeline.visible.map((message) => (
          <View
            key={message.id}
            onLayout={(event) => {
              positions.current.set(message.id, event.nativeEvent.layout.y);
              if (targetPending.current || scrollToBottom.current)
                requestAnimationFrame(alignMessages);
            }}
            style={
              (timeline.reactionTargets.get(targetId || "") || targetId) ===
              message.id
                ? {
                    borderWidth: 2,
                    borderColor: ui.orange,
                    borderRadius: 16,
                    padding: 6,
                  }
                : undefined
            }
          >
            <MessageBubble
              message={message}
              onReload={resource.refresh}
              onReply={
                writable &&
                !busy &&
                !note &&
                message.direction !== "INTERNAL_NOTE"
                  ? () => setReplyingTo(message)
                  : undefined
              }
              onReact={
                writable &&
                !busy &&
                !note &&
                conversation?.channelType === "WHATSAPP" &&
                message.direction === "INCOMING" &&
                Boolean(message.externalMessageId)
                  ? () => setReactionTarget(message)
                  : undefined
              }
              onJump={jumpToMessage}
              reactions={timeline.reactions.get(message.id) || []}
            />
          </View>
        ))}
      </ScrollView>
      {targetId && (
        <Button
          title="Latest messages"
          secondary
          onPress={() => {
            setTargetId(undefined);
            setTargetError(null);
            targetPending.current = false;
            dragging.current = false;
            scrollToBottom.current = true;
            scroll.current?.scrollToEnd({ animated: true });
          }}
        />
      )}
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: ui.white }}>
        <View style={{ padding: 12, gap: 10 }}>
          <ReadOnlyNotice />
          {optedOut && !note && (
            <Text style={l.error}>
              This contact has opted out of WhatsApp messages. Internal notes
              are still available to permitted team members.
            </Text>
          )}
          <View style={l.between}>
            <Text style={l.label}>
              {note ? "Internal note · team only" : "Reply to customer"}
            </Text>
            {canMutate(user, "conversations.internal_note") && (
              <View style={l.row}>
                <Text style={l.muted}>Note</Text>
                <Switch
                  accessibilityLabel="Internal note mode"
                  disabled={busy}
                  value={note}
                  onValueChange={(value) => {
                    setNote(value);
                    setReplyingTo(null);
                  }}
                  trackColor={{ true: ui.primary, false: ui.line }}
                />
              </View>
            )}
          </View>
          {replyingTo && !note && (
            <View
              style={[
                l.card,
                { borderLeftWidth: 3, borderLeftColor: ui.primary },
              ]}
            >
              <View style={l.between}>
                <Text style={l.label}>Replying to message</Text>
                <Button
                  title="Cancel"
                  secondary
                  disabled={busy}
                  onPress={() => setReplyingTo(null)}
                />
              </View>
              <Text numberOfLines={2} style={l.body}>
                {replyingTo.content || humanize(replyingTo.messageType)}
              </Text>
            </View>
          )}
          {attachment && (
            <View style={l.between}>
              <Text numberOfLines={1} style={[l.body, { flex: 1 }]}>
                {attachment.name}
              </Text>
              <Button
                title="Remove"
                secondary
                disabled={busy}
                onPress={() => setAttachment(null)}
              />
            </View>
          )}
          {failure && (
            <Text accessibilityRole="alert" style={l.error}>
              {failure} Your draft has been kept. Refresh the conversation
              before retrying if delivery is uncertain.
            </Text>
          )}
          <View style={l.row}>
            <Pressable
              accessibilityLabel="Add attachment"
              disabled={busy || !writable || !conversation}
              style={{ padding: 8 }}
              onPress={() =>
                Alert.alert("Add attachment", "Choose a file to send.", [
                  { text: "Photo", onPress: choosePhoto },
                  { text: "Document", onPress: chooseDocument },
                  { text: "Cancel", style: "cancel" },
                ])
              }
            >
              <MaterialCommunityIcons
                name="paperclip"
                size={24}
                color={writable ? ui.primary : ui.muted}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose emoji"
              disabled={busy || !writable || !conversation}
              onPress={() => {
                Keyboard.dismiss();
                setEmojiOpen(true);
              }}
              style={{ padding: 8 }}
            >
              <MaterialCommunityIcons
                name="emoticon-outline"
                size={24}
                color={ui.primary}
              />
            </Pressable>
            <TextInput
              onSelectionChange={(event) => {
                selection.current = event.nativeEvent.selection;
              }}
              accessibilityLabel={note ? "Internal note" : "Message"}
              style={[l.input, { flex: 1, maxHeight: 130 }]}
              multiline
              value={text}
              onChangeText={setText}
              editable={writable && !busy && Boolean(conversation)}
              placeholder={
                writable
                  ? note
                    ? "Write an internal note…"
                    : "Type a message…"
                  : "Replies are unavailable for this account"
              }
              placeholderTextColor={ui.muted}
            />
            <Button
              title={busy ? "Sending…" : note ? "Add note" : "Send"}
              disabled={
                !writable ||
                busy ||
                !conversation ||
                (!text.trim() && !attachment)
              }
              onPress={send}
            />
          </View>
          {!note &&
            canMutate(user, "conversations.send") &&
            can(user, "whatsapp_templates.read") && (
              <Button
                title="Send approved template"
                secondary
                disabled={busy || !conversation || optedOut}
                onPress={() => setTemplatesOpen(true)}
              />
            )}
        </View>
      </SafeAreaView>
      <EmojiPicker
        visible={emojiOpen || Boolean(reactionTarget)}
        title={reactionTarget ? "React to message" : "Choose an emoji"}
        onClose={() => {
          if (!busy) {
            setEmojiOpen(false);
            setReactionTarget(null);
          }
        }}
        onSelect={(emoji) => {
          if (reactionTarget) {
            void reactToMessage(emoji);
            return;
          }
          const { start, end } = selection.current;
          setText(
            (previous) =>
              previous.slice(0, start) + emoji + previous.slice(end),
          );
          selection.current = {
            start: start + emoji.length,
            end: start + emoji.length,
          };
        }}
      />
      <Modal
        visible={templatesOpen}
        animationType="slide"
        onRequestClose={() => setTemplatesOpen(false)}
      >
        {templatesOpen && (
          <TemplatePicker
            conversationId={id}
            onClose={() => setTemplatesOpen(false)}
            onSent={() => {
              setTemplatesOpen(false);
              targetPending.current = false;
              dragging.current = false;
              scrollToBottom.current = true;
              void resource.refresh();
            }}
          />
        )}
      </Modal>
      <Modal
        visible={optionsOpen}
        animationType="slide"
        onRequestClose={() => setOptionsOpen(false)}
      >
        {optionsOpen && conversation && (
          <ConversationOptions
            conversation={conversation}
            onClose={() => setOptionsOpen(false)}
            onUpdated={() => {
              setOptionsOpen(false);
              void resource.refresh();
            }}
          />
        )}
      </Modal>
    </KeyboardFrame>
  );
}
function MessageBubble({
  message,
  onReload,
  onReply,
  onReact,
  onJump,
  reactions = [],
}: {
  message: Message;
  onReload: () => void;
  onReply?: () => void;
  onReact?: () => void;
  onJump: (id: string) => void;
  reactions?: string[];
}) {
  const outgoing = message.direction === "OUTGOING";
  const note = message.direction === "INTERNAL_NOTE";
  const links = mediaLinks(message);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [message.mediaUrl]);
  return (
    <View
      style={{
        alignSelf: note ? "stretch" : outgoing ? "flex-end" : "flex-start",
        maxWidth: note ? "100%" : "90%",
        gap: 4,
      }}
    >
      <View
        style={[
          l.card,
          {
            backgroundColor: note
              ? ui.accent
              : outgoing
                ? ui.primary
                : ui.white,
          },
        ]}
      >
        {message.replyTo && (
          <Pressable
            accessibilityLabel="Go to replied message"
            disabled={!message.replyTo.id}
            onPress={() => message.replyTo?.id && onJump(message.replyTo.id)}
            style={{
              padding: 8,
              borderLeftWidth: 3,
              borderLeftColor: ui.orange,
              backgroundColor: ui.bg,
              borderRadius: 8,
            }}
          >
            <Text style={l.label}>Reply</Text>
            <Text numberOfLines={3} style={l.body}>
              {message.replyTo.content || "Attachment"}
            </Text>
          </Pressable>
        )}
        {note && <Text style={l.badge}>INTERNAL NOTE</Text>}
        {Boolean(message.content) && (
          <Text selectable style={[l.body, outgoing && { color: "white" }]}>
            {message.content}
          </Text>
        )}
        {message.messageType === "IMAGE" && links[0] && !imageFailed && (
          <Image
            source={{ uri: links[0].url }}
            style={{
              width: "100%",
              maxWidth: 230,
              height: 180,
              borderRadius: 10,
            }}
            resizeMode="contain"
            onError={() => setImageFailed(true)}
          />
        )}
        {imageFailed && (
          <Button
            title="Refresh attachment"
            secondary
            onPress={() => {
              setImageFailed(false);
              onReload();
            }}
          />
        )}
        {links.map((link) => (
          <Pressable
            key={link.url}
            accessibilityRole="link"
            onPress={() => openUrl(link.url)}
          >
            <Text
              style={[
                l.body,
                {
                  color: outgoing ? "white" : ui.primary,
                  textDecorationLine: "underline",
                },
              ]}
            >
              {link.name}
            </Text>
          </Pressable>
        ))}
        {!message.content && links.length === 0 && (
          <Text style={[l.body, outgoing && { color: "white" }]}>
            {humanize(message.messageType)} message
          </Text>
        )}
      </View>
      {reactions.length > 0 && (
        <View style={[l.row, { flexWrap: "wrap" }]}>
          {[...new Set(reactions)].map((emoji) => (
            <Text key={emoji} style={[l.badge, { fontSize: 16 }]}>
              {emoji} {reactions.filter((value) => value === emoji).length}
            </Text>
          ))}
        </View>
      )}
      {(onReply || onReact) && (
        <View style={l.row}>
          {onReply && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reply to message"
              onPress={onReply}
              style={{ padding: 10 }}
            >
              <Text style={l.label}>Reply</Text>
            </Pressable>
          )}
          {onReact && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="React to message"
              onPress={onReact}
              style={{ padding: 10 }}
            >
              <Text style={l.label}>React</Text>
            </Pressable>
          )}
        </View>
      )}
      <Text style={l.muted}>
        {message.senderUser?.fullName
          ? `${message.senderUser.fullName} · `
          : ""}
        {dateLabel(message.createdAt)}
        {outgoing && message.status ? ` · ${humanize(message.status)}` : ""}
      </Text>
    </View>
  );
}
function TemplatePicker({
  conversationId,
  onClose,
  onSent,
}: {
  conversationId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const resource = useResource<Template[]>("/whatsapp-templates");
  const [selected, setSelected] = useState<Template | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [failure, setFailure] = useState<string | null>(null);
  const body = selected?.bodyText || selected?.body || "";
  const parameters = [
    ...new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map((match) => match[1])),
  ].sort((a, b) => Number(a) - Number(b));
  const send = async () => {
    if (!selected || lock.current) return;
    lock.current = true;
    setBusy(true);
    setFailure(null);
    try {
      await api.post(
        `/whatsapp-templates/${encodeURIComponent(selected.id)}/send`,
        {
          conversationId,
          parameters: parameters.map((key) => values[key]?.trim() || ""),
        },
      );
      onSent();
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={l.page}>
      <ScrollView
        contentContainerStyle={l.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={l.between}>
          <Text style={l.title}>Approved templates</Text>
          <Button title="Close" secondary disabled={busy} onPress={onClose} />
        </View>
        <Text style={l.body}>
          Use an approved template to start or reopen a WhatsApp conversation.
        </Text>
        <Feedback
          {...resource}
          retry={resource.refresh}
          empty={
            resource.data?.filter((template) => template.status === "ACTIVE")
              .length === 0 && "No approved templates are available."
          }
        />
        {resource.data
          ?.filter((template) => template.status === "ACTIVE")
          .map((template) => (
            <Pressable
              key={template.id}
              disabled={busy}
              onPress={() => {
                setSelected(template);
                setValues({});
              }}
              style={[
                l.card,
                selected?.id === template.id && { borderColor: ui.primary },
              ]}
            >
              <Text style={l.heading}>{template.name}</Text>
              <Text style={l.body}>{template.bodyText || template.body}</Text>
              <Text style={l.muted}>{humanize(template.category)}</Text>
            </Pressable>
          ))}
        {parameters.map((key) => (
          <Field
            key={key}
            label={`Parameter ${key}`}
            value={values[key] || ""}
            onChangeText={(value) =>
              setValues((old) => ({ ...old, [key]: value }))
            }
            editable={!busy}
          />
        ))}
        {failure && <Text style={l.error}>{failure}</Text>}
        <Button
          title={busy ? "Sending…" : "Send template"}
          disabled={
            !selected || busy || parameters.some((key) => !values[key]?.trim())
          }
          onPress={send}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
function ConversationOptions({
  conversation,
  onClose,
  onUpdated,
}: {
  conversation: Conversation;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const user = useAppStore((s) => s.user);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const update = async (path: string, body: unknown) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await api.patch(
        `/conversations/${encodeURIComponent(conversation.id)}${path}`,
        body,
      );
      onUpdated();
    } catch (error) {
      Alert.alert("Could not update conversation", errorMessage(error));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={l.page}>
      <ScrollView contentContainerStyle={l.content}>
        <View style={l.between}>
          <Text style={l.title}>Conversation</Text>
          <Button title="Close" secondary onPress={onClose} disabled={busy} />
        </View>
        <Text style={l.heading}>{contactName(conversation.contact)}</Text>
        <Text style={l.body}>
          {conversation.contact?.whatsappNumber || conversation.contact?.phone}
        </Text>
        <Text style={l.body}>
          Assigned to {conversation.assignedTo?.fullName || "nobody"}
        </Text>
        <Text style={l.body}>Priority: {humanize(conversation.priority)}</Text>
        {canMutate(user, "conversations.status.update") && (
          <>
            <Text style={l.heading}>Status</Text>
            {["OPEN", "PENDING", "RESOLVED", "CLOSED"].map((status) => (
              <Button
                key={status}
                title={humanize(status)}
                secondary={conversation.status !== status}
                disabled={busy || conversation.status === status}
                onPress={() => update("/status", { status })}
              />
            ))}
          </>
        )}
        {canMutate(user, "conversations.assign") && (
          <Button
            title="Assign to me"
            disabled={busy || conversation.assignedTo?.id === user?.id}
            onPress={() => update("/assign", { ownerId: user?.id })}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function FigmaAlerts({ navigation }: any) {
  const user = useAppStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(true);
  const [query, setQuery] = useState("");
  const resource = useResource<Paginated<Notification>>(
    can(user, "notifications.read")
      ? `/notifications?page=${page}&limit=30&unreadOnly=${unreadOnly}`
      : null,
    30000,
  );
  const mark = async (id?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await api.post(
        id
          ? `/notifications/${encodeURIComponent(id)}/read`
          : "/notifications/read-all",
      );
      await resource.refresh();
    } catch (error) {
      Alert.alert("Could not update alerts", errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={l.page}>
      <PageHeader navigation={navigation} />
      <ScrollView
        contentContainerStyle={l.content}
        refreshControl={
          <RefreshControl
            refreshing={resource.loading}
            onRefresh={resource.refresh}
          />
        }
      >
        <Text style={l.title}>Alerts</Text>
        <Field
          label="Search this page"
          placeholder="Search alerts on this page"
          value={query}
          onChangeText={setQuery}
        />
        <Button
          title={unreadOnly ? "Show all alerts" : "Show unread alerts"}
          secondary
          onPress={() => {
            setPage(1);
            setUnreadOnly(!unreadOnly);
          }}
        />
        {!can(user, "notifications.read") ? (
          <AccessNotice />
        ) : (
          <>
            <Feedback
              {...resource}
              retry={resource.refresh}
              empty={
                resource.data?.items.length === 0 &&
                "You have no notifications."
              }
            />
            {canMutate(user, "notifications.manage") && (
              <Button
                title="Mark all as read"
                secondary
                disabled={busy}
                onPress={() => mark()}
              />
            )}
            {resource.data?.items
              .filter(
                (item) =>
                  (!unreadOnly || !item.isRead) &&
                  (item.title + " " + item.body)
                    .toLowerCase()
                    .includes(query.toLowerCase()),
              )
              .map((item) => (
                <View style={l.card} key={item.id}>
                  <View style={l.between}>
                    <Text style={[l.heading, { flex: 1 }]}>{item.title}</Text>
                    {!item.isRead && <Text style={l.badge}>New</Text>}
                  </View>
                  <Text style={l.body}>{item.body}</Text>
                  <Text style={l.muted}>{dateLabel(item.createdAt)}</Text>
                  {item.link && (
                    <Button
                      title="View details"
                      secondary
                      onPress={() => {
                        try {
                          const conversationId = notificationConversationId(
                            item.link,
                          );
                          if (conversationId) {
                            navigation.navigate("Inbox", {
                              screen: "Conversation",
                              params: {
                                id: conversationId,
                                messageId: notificationMessageId(item.link),
                              },
                            });
                            return;
                          }
                          const url = workspaceUrl(SITE_URL, item.link!);
                          navigation.navigate("WorkspacePage", {
                            path: url,
                            title: item.title,
                          });
                        } catch (_) {
                          Alert.alert(
                            "Link unavailable",
                            "This notification does not link to a workspace page.",
                          );
                        }
                      }}
                    />
                  )}
                  {!item.isRead && canMutate(user, "notifications.manage") && (
                    <Button
                      title="Mark as read"
                      secondary
                      disabled={busy}
                      onPress={() => mark(item.id)}
                    />
                  )}
                </View>
              ))}
            {resource.data &&
              !resource.data.items.some(
                (item) =>
                  (!unreadOnly || !item.isRead) &&
                  (item.title + " " + item.body)
                    .toLowerCase()
                    .includes(query.toLowerCase()),
              ) && (
                <Text style={l.muted}>No matching alerts on this page.</Text>
              )}
            {resource.data && (
              <Pager
                page={page}
                totalPages={resource.data.meta.totalPages}
                setPage={setPage}
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
export function FigmaCampaigns({ navigation }: any) {
  const user = useAppStore((s) => s.user);
  if (!can(user, "whatsapp_campaigns.read"))
    return (
      <View style={l.page}>
        <PageHeader navigation={navigation} />
        <AccessNotice />
      </View>
    );
  return <WorkspaceScreen path="/app/campaigns" title="Campaigns" />;
}
export function FigmaProfile({ navigation }: any) {
  const user = useAppStore((s) => s.user);
  const refreshUser = useAppStore((s) => s.refreshUser);
  const logout = useAppStore((s) => s.logout);
  const [name, setName] = useState(user?.fullName || "");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setFailure(null);
    setSaved(false);
    try {
      await api.post("/profile/update", { fullName: name.trim() });
      await refreshUser();
      setSaved(true);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={l.page}>
      <PageHeader navigation={navigation} />
      <ScrollView contentContainerStyle={l.content}>
        <Text style={l.title}>Profile</Text>
        <View style={l.card}>
          <Avatar name={user?.fullName || "User"} uri={user?.avatarUrl} />
          <Text style={l.heading}>{user?.fullName}</Text>
          <Text style={l.body}>{user?.email}</Text>
          <Text style={l.badge}>{humanize(user?.role)}</Text>
          <Text style={l.body}>{user?.organization?.name}</Text>
        </View>
        <Field
          label="Full name"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setSaved(false);
          }}
          editable={!busy}
        />
        {failure && <Text style={l.error}>{failure}</Text>}
        {saved && <Text style={l.body}>Profile saved.</Text>}
        <Button
          title={busy ? "Saving…" : "Save profile"}
          disabled={busy || name.trim().length < 3 || name.trim().length > 255}
          onPress={save}
        />
        {user?.entitlements && (
          <View style={l.card}>
            <Text style={l.heading}>{user.entitlements.planName}</Text>
            <Text style={l.body}>
              {humanize(user.entitlements.billingStatus)}
            </Text>
          </View>
        )}
        <Button
          title="Account settings"
          secondary
          onPress={() =>
            navigation.navigate("WorkspacePage", {
              path: "/app/profile",
              title: "Account settings",
            })
          }
        />
        <MobilePreferences />
        <Button
          title="Sign out"
          secondary
          onPress={() => {
            void logout().catch((error) =>
              Alert.alert(
                "Signed out on this device",
                `Server sign-out could not be confirmed. ${errorMessage(error)}`,
              ),
            );
          }}
        />
      </ScrollView>
    </View>
  );
}
