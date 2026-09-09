export type Tokens = { accessToken: string; refreshToken: string };
export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  organizationId: string;
  permissions?: string[];
  organization?: {
    id: string;
    name: string;
    slug: string;
    timezone?: string;
    currency?: string;
  };
  entitlements?: {
    planName: string;
    billingStatus: string;
    canMutate: boolean;
    readOnlyReason?: string | null;
    capabilities: string[];
  };
  onboardingProgress?: { isComplete: boolean } | null;
};
export type Paginated<T> = {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
export type Contact = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  whatsappConsentStatus?: "UNKNOWN" | "OPTED_IN" | "OPTED_OUT";
  email?: string | null;
  profilePhotoUrl?: string | null;
};
export type Message = {
  externalMessageId?: string | null;
  reaction?: { emoji: string; messageId?: string } | null;
  id: string;
  conversationId?: string;
  direction: string;
  senderType: string;
  content?: string | null;
  messageType: string;
  status?: string | null;
  createdAt: string;
  replyTo?: {
    id?: string;
    content?: string | null;
    sender?: string | null;
  } | null;
  mediaUrl?: string | null;
  senderUser?: { id: string; fullName: string } | null;
  attachments?:
    | {
        name?: string | null;
        fileName?: string | null;
        url?: string | null;
        mediaUrl?: string | null;
        mimeType?: string | null;
      }[]
    | null;
};
export type Conversation = {
  id: string;
  channelType: string;
  status: string;
  priority?: string | null;
  contact?: Contact | null;
  assignedTo?: { id: string; fullName: string } | null;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  unreadCount?: number;
  lastInboundAt?: string | null;
  slaBreachedAt?: string | null;
  messages?: Message[];
  messagesMeta?: Paginated<Message>["meta"];
};
export type Campaign = {
  id: string;
  name: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  repliedCount: number;
  failedCount: number;
  scheduledAt?: string | null;
  lastError?: string | null;
  createdAt: string;
};
export type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  link?: string | null;
};
export type Dashboard = {
  metrics: {
    trackedConversations: number;
    openConversations: number;
    pendingConversations: number;
    activeLeads: number;
    followupsDue: number;
    overdueFollowups: number;
  };
  responseQueue: Conversation[];
};
export type Template = {
  id: string;
  name: string;
  status: string;
  category: string;
  language?: string;
  bodyText?: string;
  body?: string;
};
export type UploadedFile = {
  id: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
};
export const contactName = (contact?: Contact | null) =>
  [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") ||
  contact?.whatsappNumber ||
  contact?.phone ||
  "Unknown contact";
export const humanize = (value?: string | null) =>
  value
    ? value
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "—";
export const can = (user: CurrentUser | null, ...permissions: string[]) =>
  permissions.some((permission) => user?.permissions?.includes(permission));
export const canMutate = (user: CurrentUser | null, permission: string) =>
  can(user, permission) && user?.entitlements?.canMutate !== false;
