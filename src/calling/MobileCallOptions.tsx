import React, { useEffect, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import * as Crypto from "expo-crypto";
import { useIsFocused } from "@react-navigation/native";
import { api } from "../api";
import { useAppStore } from "../store";
import { errorMessage } from "../api/client";
import { Button, Field, l } from "../liveUi";
import { Text } from "../themedText";
import { useMobileCalling } from "./MobileCallingProvider";
import { CallPermission, permissionFresh } from "./controller";

function CallSelect({
  label,
  value,
  options,
  disabled,
  select,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  disabled: boolean;
  select(value: string): void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={l.label}>{label}</Text>
      <Button
        title={
          options.find((o) => o.id === value)?.label ||
          `Choose ${label.toLowerCase()}`
        }
        secondary
        disabled={disabled || !options.length}
        onPress={() => setOpen(true)}
      />
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 24,
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
        >
          <View
            accessibilityViewIsModal
            style={[l.card, { maxHeight: "80%", gap: 12 }]}
          >
            <Text style={l.heading}>{label}</Text>
            <ScrollView>
              {options.map((o) => (
                <Pressable
                  key={o.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: o.id === value }}
                  style={{ padding: 14 }}
                  onPress={() => {
                    select(o.id);
                    setOpen(false);
                  }}
                >
                  <Text style={l.body}>{o.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Button title="Close" secondary onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function MobileCallOptions({
  phone = "",
  conversationId,
  phoneNumberId,
  onStarted,
}: {
  phone?: string;
  conversationId?: string;
  phoneNumberId?: string;
  onStarted?: () => void;
}) {
  const calling = useMobileCalling();
  const user = useAppStore((s) => s.user);
  const focused = useIsFocused();
  const [recipient, setRecipient] = useState(phone);
  const [senderId, setSenderId] = useState(phoneNumberId || "");
  const [permission, setPermission] = useState<CallPermission | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const mounted = useRef(true);
  const epoch = useRef(0);
  const requestId = useRef<string | null>(null);
  const callId = useRef<string | null>(null);
  const liveContext = useRef("");
  const senders = calling?.state?.senders || [];
  const sender = phoneNumberId
    ? senders.find((s) => s.phoneNumberId === phoneNumberId)
    : senders.find((s) => s.phoneNumberId === senderId) || senders[0];
  const context = JSON.stringify([
    user?.organizationId,
    user?.id,
    user?.permissions,
    user?.entitlements?.canMutate,
    focused,
    conversationId,
    phoneNumberId,
    phone,
    sender?.phoneNumberId,
    recipient,
    calling?.canHandle,
    calling?.state?.outboundCalling?.enabled,
  ]);
  liveContext.current = context;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    epoch.current++;
    setPermission(null);
    setTemplateId("");
    setError("");
    setNotice("");
    requestId.current = null;
    callId.current = null;
    return () => {
      epoch.current++;
    };
  }, [context]);
  useEffect(() => {
    setRecipient(phone);
    setSenderId(phoneNumberId || "");
  }, [phone, phoneNumberId, conversationId]);
  if (!calling?.enabled || !calling.canHandle || !focused) return null;
  const allowed =
    calling.state?.outboundCalling?.enabled === true &&
    !calling.controller.activeId;
  const valid = /^\+?[1-9]\d{6,14}$/.test(recipient.replace(/[\s()-]/g, ""));
  const target = {
    phoneNumberId: sender?.phoneNumberId || "",
    recipient: "+" + recipient.replace(/\D/g, ""),
    ...(conversationId ? { conversationId } : {}),
  };
  async function perform(operation: () => Promise<void>) {
    if (lock.current || !allowed || !sender || !valid) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const version = ++epoch.current;
    try {
      await operation();
    } catch (e) {
      if (version === epoch.current && liveContext.current === context)
        setError(errorMessage(e));
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function confirm(kind: "request" | "call") {
    if (!permission || !permissionFresh(permission)) {
      setPermission(null);
      setError("Refresh customer permission first.");
      return;
    }
    const version = epoch.current;
    Alert.alert(
      kind === "call" ? "Call this customer?" : "Request call permission?",
      `${target.recipient} from ${sender?.displayPhoneNumber}. ${kind === "call" ? "Meta call charges may apply. Recording stays off." : "This sends a WhatsApp permission request, not a call."}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: kind === "call" ? "Call" : "Send request",
          onPress: () => {
            if (version !== epoch.current || context !== liveContext.current)
              return;
            void perform(async () => {
              if (!permissionFresh(permission))
                throw Error("Refresh customer permission first.");
              if (kind === "call") {
                if (!permission.canCall)
                  throw Error("The customer has not allowed calls.");
                callId.current ||= Crypto.randomUUID();
                await calling!.controller.start(
                  target,
                  callId.current,
                  calling!.state!,
                );
                if (context === liveContext.current) {
                  setPermission(null);
                  setNotice("Call started. Use the call controls below.");
                  onStarted?.();
                }
              } else {
                if (
                  !permission.canRequest ||
                  (!permission.windowOpen &&
                    !permission.templates.some((t) => t.id === templateId))
                )
                  throw Error(
                    "Choose an approved call-permission template or refresh permission.",
                  );
                requestId.current ||= Crypto.randomUUID();
                const result = await api.post<{ status: string }>(
                  "/whatsapp-calls/outbound/permission-request",
                  {
                    ...target,
                    requestId: requestId.current,
                    ...(templateId ? { templateId } : {}),
                  },
                );
                if (context === liveContext.current) {
                  setPermission(null);
                  setNotice(
                    result.status === "SENT"
                      ? "Permission request sent. Wait for the customer and check again. No call placed."
                      : "Request status is uncertain. Check history; do not resend.",
                  );
                }
              }
              await calling!.refresh();
            });
          },
        },
      ],
    );
  }
  return (
    <View style={[l.card, { gap: 12 }]}>
      <Text style={l.heading}>New WhatsApp call</Text>
      <Text style={l.muted}>
        Customer permission is required. Recording is off.
      </Text>
      <Field
        label="Customer number"
        keyboardType="phone-pad"
        value={recipient}
        editable={!busy}
        onChangeText={(value) => {
          epoch.current++;
          setPermission(null);
          setRecipient(value);
        }}
      />
      <CallSelect
        label="Call from"
        value={sender?.phoneNumberId || ""}
        options={senders.map((s) => ({
          id: s.phoneNumberId,
          label: s.displayPhoneNumber || "Connected WhatsApp number",
        }))}
        disabled={busy || Boolean(phoneNumberId)}
        select={(value) => {
          epoch.current++;
          setPermission(null);
          setSenderId(value);
        }}
      />
      {!allowed && (
        <Text style={l.muted}>
          {calling.state?.outboundCalling?.reason ||
            "Outbound calling is disabled or another call is in progress."}
        </Text>
      )}
      <Button
        title="Check customer permission"
        secondary
        disabled={busy || !allowed || !sender || !valid}
        onPress={() =>
          void perform(async () => {
            const version = epoch.current;
            const result = await api.post<CallPermission>(
              "/whatsapp-calls/outbound/permission",
              target,
            );
            if (version === epoch.current && context === liveContext.current) {
              setPermission(result);
              setNotice("");
            }
          })
        }
      />
      {permission && (
        <>
          <Text style={l.body}>
            Permission: {permission.status.replaceAll("_", " ")}
          </Text>
          {!permission.windowOpen && (
            <CallSelect
              label="Approved permission template"
              value={templateId}
              disabled={busy}
              options={permission.templates.map((t) => ({
                id: t.id,
                label: `${t.name} (${t.language})`,
              }))}
              select={(value) => {
                setTemplateId(value);
                requestId.current = null;
              }}
            />
          )}
          <Button
            title="Request permission"
            secondary
            disabled={
              busy ||
              !allowed ||
              !permission.canRequest ||
              (!permission.windowOpen && !templateId)
            }
            onPress={() => confirm("request")}
          />
          <Button
            title="Call customer"
            disabled={busy || !allowed || !permission.canCall}
            onPress={() => confirm("call")}
          />
        </>
      )}
      {notice ? (
        <Text accessibilityLiveRegion="polite" style={l.body}>
          {notice}
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={l.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
