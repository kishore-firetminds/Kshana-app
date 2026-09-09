import { Text, TextInput } from "./themedText";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  TextInputProps,
  View,
} from "react-native";
import { ui } from "./figmaTheme";
import { SITE_URL } from "./api";
import { errorMessage } from "./api/client";
import { useAppStore } from "./store";

export function Button({
  title,
  onPress,
  disabled,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={[
        l.button,
        secondary && l.secondary,
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[l.buttonText, secondary && { color: ui.primary }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export const Field = React.forwardRef<
  TextInput,
  TextInputProps & { label: string }
>(function Field({ label, ...props }, ref) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={l.label}>{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={ui.muted}
        {...props}
        style={[l.input, props.style]}
      />
    </View>
  );
});
export function Feedback({
  loading,
  error,
  retry,
  empty,
}: {
  loading: boolean;
  error?: string | null;
  retry: () => void;
  empty?: string | false;
}) {
  return (
    <>
      {loading && (
        <ActivityIndicator color={ui.primary} style={{ margin: 12 }} />
      )}
      {error ? (
        <View style={l.notice}>
          <Text accessibilityRole="alert" style={l.error}>
            {error}
          </Text>
          <Button title="Try again" secondary onPress={retry} />
        </View>
      ) : !loading && empty ? (
        <View style={l.notice}>
          <Text style={l.body}>{empty}</Text>
        </View>
      ) : null}
    </>
  );
}
export function AccessNotice() {
  return (
    <View style={l.notice}>
      <Text style={l.title}>Access unavailable</Text>
      <Text style={l.body}>
        Your workspace role does not include this feature.
      </Text>
    </View>
  );
}
export function ReadOnlyNotice() {
  const entitlements = useAppStore((s) => s.user?.entitlements);
  return entitlements?.canMutate === false ? (
    <View style={l.notice}>
      <Text style={l.body}>
        {entitlements.readOnlyReason ||
          "This workspace is currently read-only. Contact your workspace owner."}
      </Text>
    </View>
  ) : null;
}
export async function openUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) {
    Alert.alert("Link unavailable", "This link cannot be opened.");
    return;
  }
  try {
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert("Link unavailable", errorMessage(error));
  }
}
export function openWeb(path: string) {
  return openUrl(`${SITE_URL}${path}`);
}
export function Avatar({ name, uri }: { name: string; uri?: string | null }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [uri]);
  return uri && !failed ? (
    <Image
      accessibilityLabel={name}
      source={{ uri }}
      style={l.avatar}
      onError={() => setFailed(true)}
    />
  ) : (
    <View
      style={[
        l.avatar,
        {
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: ui.accent,
        },
      ]}
    >
      <Text style={{ color: ui.primary, fontWeight: "800" }}>
        {name
          .split(/\s+/)
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()}
      </Text>
    </View>
  );
}
export const dateLabel = (value?: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
export const l = StyleSheet.create({
  page: { flex: 1, backgroundColor: ui.bg },
  content: {
    padding: 18,
    gap: 16,
    paddingBottom: 32,
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
  },
  card: {
    backgroundColor: ui.white,
    borderRadius: 24,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: ui.line,
  },
  title: { flexShrink: 1, fontSize: 26, fontWeight: "600", color: ui.ink },
  heading: { fontSize: 17, fontWeight: "700", color: ui.ink },
  body: { fontSize: 14, lineHeight: 21, color: ui.body },
  muted: { fontSize: 12, color: ui.muted, lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  between: {
    flexWrap: "wrap",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  button: {
    minHeight: 46,
    borderRadius: 24,
    backgroundColor: ui.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "white", fontWeight: "700", fontSize: 14 },
  secondary: {
    backgroundColor: ui.white,
    borderWidth: 1,
    borderColor: ui.line,
  },
  label: { fontWeight: "600", color: ui.ink, fontSize: 13 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: 12,
    padding: 12,
    color: ui.ink,
    backgroundColor: ui.white,
    fontSize: 15,
  },
  error: { color: ui.danger, fontSize: 14, lineHeight: 21 },
  notice: {
    padding: 16,
    gap: 12,
    backgroundColor: ui.accent,
    borderRadius: 14,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  badge: {
    alignSelf: "flex-start",
    color: ui.primary,
    fontWeight: "700",
    fontSize: 11,
    backgroundColor: ui.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
});
