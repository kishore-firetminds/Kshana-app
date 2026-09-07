export type Conversation = {
  id: string;
  name: string;
  initials: string;
  message: string;
  time: string;
  unread: number;
  status: "Open" | "Pending" | "Resolved";
  tag: string;
  color: string;
};
export type Contact = {
  id: string;
  name: string;
  phone: string;
  initials: string;
  tag: string;
  lastSeen: string;
  color: string;
};
export type Campaign = {
  id: string;
  name: string;
  status: "Running" | "Scheduled" | "Draft" | "Completed";
  sent: number;
  total: number;
  read: number;
  replies: number;
};
export type RootStackParamList = {
  Login: undefined;
  Workspace: undefined;
  App: undefined;
};
export type InboxStackParamList = {
  InboxList: undefined;
  Conversation: { id: string };
  ContactDetails: { id: string };
};
export type ContactsStackParamList = {
  ContactsList: undefined;
  ContactDetails: { id: string };
  AddContact: undefined;
};
export type CampaignStackParamList = {
  CampaignList: undefined;
  CampaignDetails: { id: string };
  CreateCampaign: undefined;
};
export type TabParamList = {
  Home: undefined;
  Inbox: undefined;
  Campaigns: undefined;
  Alerts: undefined;
  Profile: undefined;
};
export type DrawerParamList = {
  Main: undefined;
  Templates: undefined;
  Automations: undefined;
  Analytics: undefined;
  Team: undefined;
  Integrations: undefined;
  Subscription: undefined;
  Settings: undefined;
  Help: undefined;
};
