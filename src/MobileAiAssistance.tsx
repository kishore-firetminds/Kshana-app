import React, { useEffect, useRef, useState } from "react";
import { Modal, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "./KeyboardLayout";
import { useIsFocused } from "@react-navigation/native";
import { Text, TextInput } from "./themedText";
import { Button, l } from "./liveUi";
import { api } from "./api";
import { errorMessage } from "./api/client";
import { useResource } from "./useResource";

type Capabilities = {
  aiAssistanceEnabled: boolean;
  suggestedDraftsEnabled: boolean;
  conversationSummaryEnabled: boolean;
  policyVersion?: string;
};

export function MobileAiAssistance({
  conversationId,
  phoneNumberId,
  contextKey,
  allowed,
  canSuggest,
  hasDraft,
  onUse,
}: {
  conversationId: string;
  phoneNumberId?: string;
  contextKey: string;
  allowed: boolean;
  canSuggest: boolean;
  hasDraft: boolean;
  onUse: (draft: string) => void;
}) {
  const focused = useIsFocused();
  const capabilities = useResource<Capabilities>(
    allowed && focused ? "/ai-assistance/capabilities" : null,
    30000,
  );
  const settings = capabilities.data;
  const enabled = allowed && focused && settings?.aiAssistanceEnabled === true;
  const key = JSON.stringify([
    conversationId,
    phoneNumberId,
    contextKey,
    enabled,
    canSuggest,
    settings?.suggestedDraftsEnabled,
    settings?.conversationSummaryEnabled,
    settings?.policyVersion,
  ]);
  const current = useRef(key);
  current.current = key;
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ key: string; text: string } | null>(
    null,
  );
  const [summary, setSummary] = useState<{ key: string; text: string } | null>(
    null,
  );
  const [failure, setFailure] = useState<{ key: string; text: string } | null>(
    null,
  );
  const [view, setView] = useState<"draft" | "summary" | null>(null);
  useEffect(() => {
    sequence.current++;
    controller.current?.abort();
    lock.current = false;
    setBusy(false);
    setDraft(null);
    setSummary(null);
    setFailure(null);
    setView(null);
    return () => {
      sequence.current++;
      controller.current?.abort();
    };
  }, [key]);
  async function generate(feature: "suggest-reply" | "summary") {
    if (
      !enabled ||
      lock.current ||
      (feature === "suggest-reply"
        ? !canSuggest || !settings?.suggestedDraftsEnabled
        : !settings?.conversationSummaryEnabled)
    )
      return;
    lock.current = true;
    setBusy(true);
    setFailure(null);
    const request = ++sequence.current;
    const abort = new AbortController();
    controller.current = abort;
    try {
      const result = await api.request<{ draft?: string; summary?: string }>(
        `/ai-assistance/conversations/${encodeURIComponent(conversationId)}/${feature}`,
        {
          method: "POST",
          signal: abort.signal,
          ...(phoneNumberId
            ? { headers: { "x-whatsapp-phone-number-id": phoneNumberId } }
            : {}),
        },
      );
      if (
        current.current !== key ||
        sequence.current !== request ||
        abort.signal.aborted
      )
        return;
      const text = feature === "summary" ? result.summary : result.draft;
      if (!text?.trim())
        throw Error("AI returned no text. Your message has not changed.");
      if (feature === "summary") {
        setSummary({ key, text });
        setView("summary");
      } else {
        setDraft({ key, text });
        setView("draft");
      }
    } catch (error) {
      if (
        current.current === key &&
        sequence.current === request &&
        !abort.signal.aborted
      )
        setFailure({ key, text: errorMessage(error) });
    } finally {
      if (current.current === key && sequence.current === request) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  function closeReview() {
    sequence.current++;
    controller.current?.abort();
    lock.current = false;
    setBusy(false);
    setView(null);
  }
  if (!enabled) return null;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {settings?.suggestedDraftsEnabled && (
          <Button
            title={draft?.key === key ? "Review AI draft" : "Suggest reply"}
            secondary
            disabled={busy || !canSuggest}
            onPress={() => {
              if (draft?.key === key) setView("draft");
              else void generate("suggest-reply");
            }}
          />
        )}
        {settings?.conversationSummaryEnabled && (
          <Button
            title={
              summary?.key === key ? "View summary" : "Summarize conversation"
            }
            secondary
            disabled={busy}
            onPress={() => {
              if (summary?.key === key) setView("summary");
              else void generate("summary");
            }}
          />
        )}
      </View>
      {busy && (
        <Text accessibilityLiveRegion="polite" style={l.muted}>
          Generating AI assistance. Nothing will be sent automatically.
        </Text>
      )}
      {failure?.key === key && (
        <Text accessibilityRole="alert" style={l.error}>
          {failure.text} Your message has not changed.
        </Text>
      )}
      <Modal
        visible={Boolean(
          view &&
          (view === "draft" ? draft?.key === key : summary?.key === key),
        )}
        animationType="slide"
        onRequestClose={closeReview}
      >
        <SafeAreaView style={l.page}>
          <View
            style={[l.between, { paddingHorizontal: 20, paddingVertical: 12 }]}
          >
            <Text style={l.title}>
              {view === "draft" ? "Review AI reply" : "Conversation summary"}
            </Text>
            <Button title="Close AI review" secondary onPress={closeReview} />
          </View>
          <ScrollView contentContainerStyle={l.content}>
            {view === "draft" && draft?.key === key && (
              <View style={l.card}>
                <Text style={l.label}>
                  AI-assisted draft · review before using
                </Text>
                <TextInput
                  accessibilityLabel="Review AI reply"
                  multiline
                  style={[l.input, { maxHeight: 160 }]}
                  value={draft.text}
                  editable={!busy && canSuggest}
                  onChangeText={(text) => setDraft({ key, text })}
                />
                <Button
                  title={
                    hasDraft ? "Replace message with AI draft" : "Use AI draft"
                  }
                  secondary
                  disabled={busy || !canSuggest || !draft.text.trim()}
                  onPress={() => {
                    if (current.current === key && canSuggest) {
                      onUse(draft.text);
                      setView(null);
                    }
                  }}
                />
                <Button
                  title="Discard AI draft"
                  secondary
                  disabled={busy}
                  onPress={() => {
                    setDraft(null);
                    setView(null);
                  }}
                />
                <Button
                  title="Generate another draft"
                  secondary
                  disabled={busy || !canSuggest}
                  onPress={() => void generate("suggest-reply")}
                />
                <Text style={l.muted}>
                  Using this draft only copies it into your message. Review and
                  press Send separately.
                </Text>
              </View>
            )}
            {view === "summary" && summary?.key === key && (
              <View style={l.card}>
                <Text style={l.label}>
                  AI-assisted summary · verify against the conversation
                </Text>
                <Text selectable style={l.body}>
                  {summary.text}
                </Text>
                <Button
                  title="Dismiss summary"
                  secondary
                  onPress={() => {
                    setSummary(null);
                    setView(null);
                  }}
                />
                <Button
                  title="Refresh summary"
                  secondary
                  disabled={busy}
                  onPress={() => void generate("summary")}
                />
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
