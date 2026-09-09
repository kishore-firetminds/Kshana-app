import React, { useState } from "react";
import { Alert, Linking, Switch, View } from "react-native";
import { Text } from "./themedText";
import { Button, l } from "./liveUi";
import { api, SITE_URL } from "./api";
import { errorMessage } from "./api/client";
import {
  eraseAnalytics,
  mobilePreferences,
  registerPush,
  setAnalyticsEnabled,
  unregisterPush,
} from "./mobileServices";
import { ui } from "./figmaTheme";

export function MobilePreferences() {
  const { analytics, push, loaded } = mobilePreferences();
  const [busy, setBusy] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      Alert.alert("Could not complete action", errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={l.card}>
      <Text style={l.heading}>Notifications & privacy</Text>
      <Text style={l.body}>
        Receive workspace alerts when the app is closed. Message content stays
        hidden in notification previews.
      </Text>
      <Button
        title={
          push ? "Turn off push notifications" : "Enable push notifications"
        }
        secondary
        disabled={busy || !loaded}
        onPress={() =>
          void run(() => (push ? unregisterPush() : registerPush(true)))
        }
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text style={[l.body, { flex: 1 }]}>Share app usage analytics</Text>
        <Switch
          accessibilityLabel="Share app usage analytics"
          value={analytics}
          disabled={busy || !loaded}
          trackColor={{ true: ui.primary }}
          onValueChange={(value) => void run(() => setAnalyticsEnabled(value))}
        />
      </View>
      <Text style={l.body}>
        Optional screen visits and notification opens help improve KshanaAPI.
        Stored with your account for up to 90 days. No message text, contacts,
        or advertising identifiers are included.
      </Text>
      <Button
        title="Delete my usage analytics"
        secondary
        disabled={busy}
        onPress={() =>
          Alert.alert(
            "Delete usage analytics?",
            "This turns off collection and deletes your recorded mobile usage events.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => void run(eraseAnalytics),
              },
            ],
          )
        }
      />
      <Button
        title="Privacy policy"
        secondary
        onPress={() =>
          void run(() => Linking.openURL(`${SITE_URL}/privacy-policy`))
        }
      />
      <Button
        title="Terms of service"
        secondary
        onPress={() =>
          void run(() => Linking.openURL(`${SITE_URL}/terms-and-conditions`))
        }
      />
      <Button
        title={
          deletionRequested
            ? "Deletion request submitted"
            : "Request account deletion"
        }
        secondary
        disabled={busy || deletionRequested}
        onPress={() =>
          Alert.alert(
            "Request account deletion?",
            "This submits a request to delete your KshanaAPI account and associated personal data. Your account is not deleted immediately. Workspace records and legally required data may be retained.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Submit request",
                style: "destructive",
                onPress: () =>
                  void run(async () => {
                    await api.post("/profile/delete-request", {
                      reason: "Account deletion requested from the mobile app.",
                    });
                    setDeletionRequested(true);
                  }),
              },
            ],
          )
        }
      />
    </View>
  );
}
