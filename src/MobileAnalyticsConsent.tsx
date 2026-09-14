import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { Text } from "./themedText";
import { mobilePreferences, setAnalyticsEnabled } from "./mobileServices";
import { ui, uiShadow } from "./figmaTheme";

export function MobileAnalyticsConsent() {
  const { analyticsConsentRequired, loaded } = mobilePreferences();
  const [saving, setSaving] = useState(false);

  const saveChoice = async (enabled: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      await setAnalyticsEnabled(enabled);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={loaded && analyticsConsentRequired}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.card}>
          <Text style={styles.eyebrow}>YOUR PRIVACY</Text>
          <Text style={styles.title}>Help improve KshanaAPI</Text>
          <Text style={styles.body}>
            Share anonymous app usage such as screen visits and notification
            opens. We never collect message text, contacts, or advertising IDs.
          </Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => void saveChoice(false)}
              style={[styles.button, styles.secondary, saving && styles.disabled]}
            >
              <Text style={styles.secondaryText}>Not now</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => void saveChoice(true)}
              style={[styles.button, styles.primary, saving && styles.disabled]}
            >
              <Text style={styles.primaryText}>
                {saving ? "Saving..." : "Share analytics"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.note}>
            You can change or delete this data anytime in Profile.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(12, 30, 22, 0.46)",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    gap: 14,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: ui.white,
    ...uiShadow,
  },
  eyebrow: {
    color: ui.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: { color: ui.ink, fontSize: 22, fontWeight: "700" },
  body: { color: ui.body, fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: "row", gap: 10, marginTop: 2 },
  button: {
    minHeight: 46,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 23,
  },
  primary: { backgroundColor: ui.primary },
  secondary: { borderWidth: 1, borderColor: ui.line, backgroundColor: ui.white },
  primaryText: { color: "white", fontSize: 14, fontWeight: "700" },
  secondaryText: { color: ui.primary, fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  note: { color: ui.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
});
