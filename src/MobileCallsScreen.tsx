import React from "react";
import { Switch, View } from "react-native";
import { ScrollView } from "./KeyboardLayout";
import { BrandHeader } from "./figmaComponents";
import { Text } from "./themedText";
import { Button, Feedback, dateLabel, l } from "./liveUi";
import { humanize } from "./api/types";
import { useMobileCalling } from "./calling/MobileCallingProvider";
import { MobileCallOptions } from "./calling/MobileCallOptions";

export function MobileCallsScreen({ navigation }: { navigation: any }) {
  const calling = useMobileCalling();
  if (!calling)
    return (
      <View style={l.page}>
        <Text style={l.body}>
          Call history is unavailable for this account.
        </Text>
      </View>
    );
  const resource = {
    data: calling.state,
    loading: calling.loading,
    error: calling.error,
    refresh: calling.refresh,
  };
  return (
    <View style={l.page}>
      <BrandHeader onAvatar={() => navigation.openDrawer()} />
      <ScrollView contentContainerStyle={l.content}>
        <Text accessibilityRole="header" style={l.title}>
          WhatsApp calls
        </Text>
        <View style={l.card}>
          <Text style={l.body}>
            {calling.enabled
              ? "Answer and place calls while this app is open. Customer permission and workspace allowances apply."
              : "Review recent calls here. Install the native calling QA build to test answering and outbound audio."}
          </Text>
          <Text style={l.muted}>
            Recording is off. Background and lock-screen ringing are not
            available yet. Moving the app to the background ends its call audio.
          </Text>
          {resource.data?.allowance && (
            <Text style={l.body}>
              {resource.data.mode !== "disabled" &&
              resource.data.allowance.eligible
                ? `${resource.data.allowance.remaining} accepted calls remaining in the current allowance.`
                : "Calling is not currently enabled for this workspace or its allowance has expired."}
            </Text>
          )}
        </View>
        {calling.canHandle && (
          <View style={[l.card, l.row]}>
            <View style={{ flex: 1 }}>
              <Text style={l.heading}>Available for incoming calls</Text>
              <Text style={l.muted}>
                Alerts appear across screens while the app is open.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Available for incoming calls"
              value={calling.available}
              onValueChange={calling.setAvailable}
            />
          </View>
        )}
        <MobileCallOptions />
        <Button
          title="Refresh call history"
          secondary
          onPress={resource.refresh}
          disabled={resource.loading}
        />
        <Feedback
          {...resource}
          retry={resource.refresh}
          empty={resource.data?.calls.length === 0 && "No calls found."}
        />
        {resource.data?.calls.map((call) => (
          <View key={call.id} style={l.card}>
            <Text style={l.heading}>
              {call.callerName || "WhatsApp caller"}
            </Text>
            <Text style={l.body}>
              {call.callerPhone && /^\+?[1-9]\d{6,14}$/.test(call.callerPhone)
                ? `+${call.callerPhone.replace(/^\+/, "")}`
                : "Phone number not shared"}
            </Text>
            <Text style={l.muted}>
              {humanize(call.direction || "INBOUND")} · {humanize(call.status)}{" "}
              · {Math.max(0, call.durationSeconds)} seconds
            </Text>
            <Text style={l.muted}>{dateLabel(call.createdAt)}</Text>
            {call.conversationId && (
              <Button
                title="Open conversation"
                secondary
                onPress={() =>
                  navigation.navigate("Main", {
                    screen: "Inbox",
                    params: {
                      screen: "Conversation",
                      params: { id: call.conversationId },
                    },
                  })
                }
              />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
