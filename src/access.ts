import type { CurrentUser } from "./api/types";
import { can } from "./api/types";

export type AccessRule = {
  permission?: string;
  anyPermission?: readonly string[];
  platformOnly?: boolean;
};

export const isPlatformAdmin = (user: CurrentUser | null) =>
  user?.role === "PLATFORM_ADMIN" || user?.role === "PLATFORM_SUPER_ADMIN";

export function canAccess(user: CurrentUser | null, rule: AccessRule = {}) {
  if (!user) return false;
  if (rule.platformOnly && !isPlatformAdmin(user)) return false;
  if (rule.permission && !can(user, rule.permission)) return false;
  if (rule.anyPermission?.length && !can(user, ...rule.anyPermission))
    return false;
  return true;
}

const tabAccess: Record<string, AccessRule> = {
  Home: { permission: "dashboard.read" },
  Inbox: {
    anyPermission: ["conversations.read.all", "conversations.read.own"],
  },
  Campaigns: { permission: "whatsapp_campaigns.read" },
  Alerts: { permission: "notifications.read" },
  Profile: {},
};

export const canAccessTab = (user: CurrentUser | null, tab: string) =>
  canAccess(user, tabAccess[tab] ?? { permission: "__unknown_feature__" });

const routeAccess: Record<string, AccessRule> = {
  Contacts: { permission: "contacts.read" },
  Templates: { permission: "whatsapp_templates.read" },
  Flows: { permission: "whatsapp_templates.read" },
  Automations: { permission: "automation_flows.read" },
  QuickReplies: { permission: "settings.read" },
  Billing: { permission: "billing.read" },
};

export const canAccessRoute = (user: CurrentUser | null, route: string) =>
  route in tabAccess
    ? canAccessTab(user, route)
    : canAccess(
        user,
        routeAccess[route] ?? { permission: "__unknown_feature__" },
      );

const workspaceRules: Array<{
  matches: (path: string) => boolean;
  rule: AccessRule;
}> = [
  {
    matches: (path) => path === "/app",
    rule: { permission: "dashboard.read" },
  },
  {
    matches: (path) => inSection(path, "/app/inbox"),
    rule: {
      anyPermission: ["conversations.read.all", "conversations.read.own"],
    },
  },
  {
    matches: (path) => inSection(path, "/app/campaigns"),
    rule: { permission: "whatsapp_campaigns.read" },
  },
  {
    matches: (path) =>
      ["/app/templates", "/app/flows", "/app/library"].some((prefix) =>
        inSection(path, prefix),
      ),
    rule: { permission: "whatsapp_templates.read" },
  },
  {
    matches: (path) => inSection(path, "/app/automation"),
    rule: { permission: "automation_flows.read" },
  },
  {
    matches: (path) =>
      inSection(path, "/app/contacts") || inSection(path, "/app/companies"),
    rule: { permission: "contacts.read" },
  },
  {
    matches: (path) => inSection(path, "/app/leads"),
    rule: { permission: "leads.read" },
  },
  {
    matches: (path) => inSection(path, "/app/tasks"),
    rule: { permission: "tasks.read" },
  },
  {
    matches: (path) => inSection(path, "/app/reports"),
    rule: { permission: "reports.read" },
  },
  {
    matches: (path) => inSection(path, "/app/team"),
    rule: { permission: "users.read" },
  },
  {
    matches: (path) => inSection(path, "/app/developer"),
    rule: { permission: "integrations.read" },
  },
  {
    matches: (path) =>
      ["/app/billing", "/app/usage", "/app/meta-payments"].some((prefix) =>
        inSection(path, prefix),
      ),
    rule: { permission: "billing.read" },
  },
  {
    matches: (path) => inSection(path, "/app/settings"),
    rule: { permission: "settings.read" },
  },
  {
    matches: (path) => inSection(path, "/app/platform/catalog"),
    rule: { permission: "platform.settings.read", platformOnly: true },
  },
  {
    matches: (path) => inSection(path, "/app/platform"),
    rule: { platformOnly: true },
  },
  { matches: (path) => inSection(path, "/app/profile"), rule: {} },
  { matches: (path) => path === "/support", rule: {} },
];

function inSection(path: string, prefix: string) {
  return path === prefix || path.startsWith(prefix + "/");
}

export function canAccessWorkspacePath(
  user: CurrentUser | null,
  href: string,
  siteOrigin?: string,
) {
  let url: URL;
  try {
    const base = siteOrigin || "https://workspace.invalid";
    url = new URL(href, base);
    if (siteOrigin && url.origin !== new URL(siteOrigin).origin) return false;
    if (!siteOrigin && /^[a-z][a-z\d+.-]*:/i.test(href)) return false;
  } catch {
    return false;
  }
  const match = workspaceRules.find((entry) => entry.matches(url.pathname));
  return Boolean(match && canAccess(user, match.rule));
}
