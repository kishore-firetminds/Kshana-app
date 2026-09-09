import React from "react";
import { View } from "react-native";
import { WorkspaceScreen } from "./WorkspaceScreen";
import { useAppStore } from "./store";
import { can } from "./api/types";
import { AccessNotice, l } from "./liveUi";
import { BrandHeader } from "./figmaComponents";
import { MobileAnalyticsScreen } from "./MobileAnalyticsScreen";

export const moduleConfig: Record<
  string,
  { permission?: string; title: string; web: string }
> = {
  Templates: {
    permission: "whatsapp_templates.read",
    title: "Message templates",
    web: "/app/templates",
  },
  Automations: {
    permission: "automation_flows.read",
    title: "Automations",
    web: "/app/automation",
  },
  Contacts: {
    permission: "contacts.read",
    title: "Contacts",
    web: "/app/contacts",
  },
  Leads: { permission: "leads.read", title: "Leads", web: "/app/leads" },
  Companies: {
    permission: "contacts.read",
    title: "Businesses",
    web: "/app/companies",
  },
  Tasks: { permission: "tasks.read", title: "Follow-ups", web: "/app/tasks" },
  Library: {
    permission: "whatsapp_templates.read",
    title: "Template library",
    web: "/app/library",
  },
  QuickReplies: {
    permission: "settings.read",
    title: "Quick replies",
    web: "/app/settings/quick-replies",
  },
  Analytics: {
    permission: "reports.read",
    title: "Analytics",
    web: "/app/reports",
  },
  Team: {
    permission: "users.read",
    title: "Team management",
    web: "/app/team",
  },
  Integrations: {
    permission: "settings.read",
    title: "Integrations",
    web: "/app/settings",
  },
  Developer: {
    permission: "integrations.read",
    title: "Developers",
    web: "/app/developer",
  },
  Settings: {
    permission: "settings.read",
    title: "Workspace settings",
    web: "/app/settings",
  },
  Help: { title: "Help & support", web: "/support" },
};
export function ModuleScreen({ route, navigation }: any) {
  const user = useAppStore((s) => s.user);
  const config = moduleConfig[route.name];
  if (config.permission && !can(user, config.permission))
    return (
      <View style={l.page}>
        <BrandHeader onAvatar={() => navigation.openDrawer()} />
        <AccessNotice />
      </View>
    );
  if (route.name === "Analytics")
    return <MobileAnalyticsScreen navigation={navigation} />;
  return <WorkspaceScreen path={config.web} title={config.title} />;
}
