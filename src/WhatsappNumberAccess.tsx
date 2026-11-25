import React, { useEffect, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { Check, ChevronDown, Phone, ShieldCheck } from "lucide-react-native";
import { Text } from "./themedText";
import { BrandHeader } from "./figmaComponents";
import { Button, Feedback, Field, l } from "./liveUi";
import { useResource } from "./useResource";
import { useAppStore } from "./store";
import { api } from "./api";
import { errorMessage } from "./api/client";
import {
  MemberNumbers,
  NumberAccessPolicy,
  numberAccessPayload,
} from "./api/numberAccess";
import { ui } from "./figmaTheme";

export function MemberNumberSelector({
  onChanged,
}: {
  onChanged: (id: string | null) => void;
}) {
  const resource = useResource<MemberNumbers>(
    "/integrations/whatsapp/my-numbers",
    15000,
  );
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const selecting = useRef(false);
  const previous = useRef<string | null | undefined>(undefined);
  const active = resource.data?.activePhoneNumberId;
  useEffect(() => {
    if (!busy && active !== undefined && previous.current !== active) {
      previous.current = active;
      onChanged(active);
    }
  }, [active, busy, onChanged]);
  async function select(phoneNumberId: string) {
    if (selecting.current) return;
    selecting.current = true;
    setBusy(true);
    try {
      const next = await api.post<MemberNumbers>(
        "/integrations/whatsapp/active-number",
        { phoneNumberId },
      );
      previous.current = next.activePhoneNumberId;
      onChanged(next.activePhoneNumberId);
      setOpen(false);
      await resource.refresh();
    } catch (error) {
      Alert.alert("Unable to switch number", errorMessage(error));
    } finally {
      selecting.current = false;
      setBusy(false);
    }
  }
  const selected = resource.data?.accounts.find(
    (account) => account.phoneNumberId === active,
  );
  return (
    <View>
      <Feedback
        loading={resource.loading && !resource.data}
        error={resource.error}
        retry={resource.refresh}
      />
      {resource.data ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose your WhatsApp number"
          disabled={busy || !resource.data.accounts.length}
          onPress={() => setOpen(true)}
          style={[l.card, l.row]}
        >
          <Phone size={18} color={ui.primary} />
          <View style={{ flex: 1 }}>
            <Text style={l.muted}>Your WhatsApp number</Text>
            <Text style={l.heading}>
              {selected?.displayPhoneNumber ||
                selected?.verifiedName ||
                (active ? "Connected WhatsApp number" : "No number assigned")}
            </Text>
          </View>
          {resource.data.accounts.length ? (
            <ChevronDown size={18} color={ui.primary} />
          ) : null}
        </Pressable>
      ) : null}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <Pressable
          accessibilityLabel="Close number selection"
          onPress={() => {
            if (!busy) setOpen(false);
          }}
          style={{
            flex: 1,
            backgroundColor: "rgba(20,38,29,0.4)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[l.card, { maxHeight: "80%", paddingBottom: 32 }]}
          >
            <Text accessibilityRole="header" style={l.heading}>
              Choose your WhatsApp number
            </Text>
            <ScrollView>
              {resource.data?.accounts.map((account) => (
                <Pressable
                  key={account.phoneNumberId}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: active === account.phoneNumberId,
                    disabled: busy,
                  }}
                  disabled={busy}
                  onPress={() => void select(account.phoneNumberId)}
                  style={[l.row, { paddingVertical: 16 }]}
                >
                  <Phone size={18} color={ui.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={l.heading}>
                      {account.displayPhoneNumber ||
                        account.verifiedName ||
                        "Connected WhatsApp number"}
                    </Text>
                    {account.verifiedName ? (
                      <Text style={l.muted}>{account.verifiedName}</Text>
                    ) : null}
                  </View>
                  {active === account.phoneNumberId ? (
                    <Check size={20} color={ui.primary} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
            <Button
              secondary
              title={busy ? "Switching..." : "Close"}
              disabled={busy}
              onPress={() => setOpen(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function NumberAccessScreen({ navigation }: { navigation: any }) {
  const user = useAppStore((state) => state.user);
  const admin = Boolean(
    user &&
    ["OWNER", "ADMIN", "PLATFORM_SUPER_ADMIN", "PLATFORM_ADMIN"].includes(
      user.role,
    ),
  );
  const resource = useResource<NumberAccessPolicy>(
    admin ? "/integrations/whatsapp/number-access" : null,
  );
  const writable = admin && user?.entitlements?.canMutate !== false;
  const [draft, setDraft] = useState<NumberAccessPolicy | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const lock = useRef(false);
  const dirty = Boolean(
    draft &&
    resource.data &&
    JSON.stringify(numberAccessPayload(draft)) !==
      JSON.stringify(numberAccessPayload(resource.data)),
  );
  useEffect(() => {
    if (!resource.data || !admin) setDraft(null);
    else if (!dirty) setDraft(resource.data);
  }, [resource.data, dirty, admin]);
  async function save() {
    if (!draft || !resource.data || !writable || lock.current) return;
    lock.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const next = await api.post<NumberAccessPolicy>(
        "/integrations/whatsapp/number-access",
        numberAccessPayload(draft),
      );
      setDraft(next);
      await resource.refresh();
      Alert.alert("Assignments saved");
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function confirm() {
    Alert.alert(
      "Update number access?",
      "Members can only access assigned numbers. Conversations assigned to members who lose access become unassigned. Owners and admins retain all numbers.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Save assignments", onPress: () => void save() },
      ],
    );
  }
  function toggle(phoneNumberId: string, userId: string) {
    setDraft((current) => {
      if (!current) return current;
      const existing =
        current.assignments.find(
          (assignment) => assignment.phoneNumberId === phoneNumberId,
        )?.userIds ?? [];
      return {
        ...current,
        assignments: [
          ...current.assignments.filter(
            (assignment) => assignment.phoneNumberId !== phoneNumberId,
          ),
          {
            phoneNumberId,
            userIds: existing.includes(userId)
              ? existing.filter((id) => id !== userId)
              : [...existing, userId],
          },
        ],
      };
    });
  }
  return (
    <View style={l.page}>
      <BrandHeader onAvatar={() => navigation.openDrawer()} />
      <ScrollView contentContainerStyle={l.content}>
        <Text accessibilityRole="header" style={l.title}>
          Team management
        </Text>
        <Button
          title="Members, roles and invitations"
          secondary
          onPress={() =>
            navigation.navigate("WorkspacePage", {
              path: "/app/team",
              title: "Team management",
            })
          }
        />
        {admin ? (
          <>
            <View style={l.row}>
              <ShieldCheck color={ui.primary} size={22} />
              <Text style={l.heading}>WhatsApp number access</Text>
            </View>
            <Text style={l.body}>
              Assign each number to the teammates who handle it. Owners and
              admins retain access to all connected numbers.
            </Text>
            {!writable && (
              <Text style={l.muted}>
                This workspace is read-only. Number assignments cannot be
                changed.
              </Text>
            )}
            <Feedback {...resource} retry={resource.refresh} />
            {failure ? (
              <View style={l.card}>
                <Text accessibilityRole="alert" style={l.error}>
                  {failure}
                </Text>
                <Button
                  title="Reload assignments"
                  secondary
                  disabled={busy}
                  onPress={() => {
                    setDraft(null);
                    void resource.refresh();
                  }}
                />
              </View>
            ) : null}
            {draft && resource.data ? (
              <>
                <View style={[l.card, l.between]}>
                  <Text style={[l.body, { flex: 1 }]}>
                    Assigned-number access
                  </Text>
                  <ShieldCheck color={ui.primary} size={20} />
                </View>
                <Field
                  label="Find a teammate"
                  value={search}
                  onChangeText={setSearch}
                />
                {draft.accounts.map((account) => {
                  const ids =
                    draft.assignments.find(
                      (assignment) =>
                        assignment.phoneNumberId === account.phoneNumberId,
                    )?.userIds ?? [];
                  return (
                    <View key={account.phoneNumberId} style={l.card}>
                      <View style={l.row}>
                        <Phone color={ui.primary} size={18} />
                        <View style={{ flex: 1 }}>
                          <Text style={l.heading}>
                            {account.displayPhoneNumber ||
                              account.verifiedName ||
                              "Connected WhatsApp number"}
                          </Text>
                          {account.verifiedName ? (
                            <Text style={l.muted}>{account.verifiedName}</Text>
                          ) : null}
                        </View>
                      </View>
                      <ScrollView
                        nestedScrollEnabled
                        style={{ maxHeight: 300 }}
                      >
                        {draft.members
                          .filter(
                            (member) =>
                              !["OWNER", "ADMIN"].includes(member.role) &&
                              `${member.fullName} ${member.email}`
                                .toLowerCase()
                                .includes(search.toLowerCase()),
                          )
                          .map((member) => (
                            <Pressable
                              key={member.id}
                              disabled={busy || !writable}
                              accessibilityRole="checkbox"
                              accessibilityState={{
                                checked: ids.includes(member.id),
                                disabled: busy || !writable,
                              }}
                              onPress={() =>
                                toggle(account.phoneNumberId, member.id)
                              }
                              style={[l.row, { paddingVertical: 12 }]}
                            >
                              <View
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderWidth: 1,
                                  borderColor: ui.primary,
                                  borderRadius: 6,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backgroundColor: ids.includes(member.id)
                                    ? ui.primary
                                    : ui.white,
                                }}
                              >
                                {ids.includes(member.id) ? (
                                  <Check color={ui.white} size={16} />
                                ) : null}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={l.body}>{member.fullName}</Text>
                                <Text style={l.muted}>{member.email}</Text>
                              </View>
                            </Pressable>
                          ))}
                      </ScrollView>
                    </View>
                  );
                })}
                {!draft.accounts.length ? (
                  <Text style={l.body}>
                    Connect a WhatsApp number in Settings before assigning
                    access.
                  </Text>
                ) : null}
                <Text style={l.muted}>
                  {draft.enabled
                    ? "Members without an assignment cannot access WhatsApp numbers."
                    : "Save to enforce assignments. Unassigned members will lose number access."}
                </Text>
                <Button
                  title={busy ? "Saving..." : "Save assignments"}
                  disabled={
                    !writable ||
                    busy ||
                    (!dirty && draft.enabled) ||
                    !draft.accounts.length
                  }
                  onPress={confirm}
                />
                <Button
                  title="Discard changes"
                  secondary
                  disabled={busy || !dirty}
                  onPress={() => setDraft(resource.data)}
                />
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
