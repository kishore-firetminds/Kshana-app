import { ScrollView } from "./KeyboardLayout";
import React from "react";
import { View } from "react-native";
import { Text } from "./themedText";
import { BrandHeader } from "./figmaComponents";
import { Button, Feedback, l } from "./liveUi";
import { useResource } from "./useResource";

type Report = {
  days: number;
  activeUsers: number;
  notificationOpens: number;
  screens: Array<{ screen: string; views: number }>;
};
export function MobileAnalyticsScreen({ navigation }: any) {
  const report = useResource<Report>("/mobile/analytics");
  return (
    <View style={l.page}>
      <BrandHeader onAvatar={() => navigation.openDrawer()} onSearch={false} />
      <ScrollView contentContainerStyle={l.content}>
        <Text style={l.title}>Analytics</Text>
        <View style={l.card}>
          <Text style={l.heading}>Business reports</Text>
          <Text style={l.body}>
            Explore workspace performance using the same reports available on
            the web.
          </Text>
          <Button
            title="Open business reports"
            onPress={() =>
              navigation.navigate("WorkspacePage", {
                path: "/app/reports",
                title: "Business reports",
              })
            }
          />
        </View>
        <Text style={l.heading}>Mobile usage - last 30 days</Text>
        <Text style={l.body}>
          Includes only users who choose to share app usage analytics.
        </Text>
        <Feedback
          loading={report.loading}
          error={report.error}
          retry={report.refresh}
        />
        {report.data && (
          <>
            <View style={l.card}>
              <Text style={l.heading}>
                {report.data.activeUsers} active users
              </Text>
              <Text style={l.body}>
                {report.data.notificationOpens} notification opens
              </Text>
              <Text style={l.body}>
                {report.data.screens.reduce(
                  (sum, screen) => sum + screen.views,
                  0,
                )}{" "}
                screen visits
              </Text>
            </View>
            {report.data.screens.length === 0 && (
              <Text style={l.body}>No mobile usage events recorded yet.</Text>
            )}
            {[...report.data.screens]
              .sort((a, b) => b.views - a.views)
              .map((item) => (
                <View
                  key={item.screen}
                  style={[
                    l.card,
                    { flexDirection: "row", justifyContent: "space-between" },
                  ]}
                >
                  <Text style={l.body}>{item.screen}</Text>
                  <Text style={l.heading}>{item.views}</Text>
                </View>
              ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
