import { ui } from "./figmaTheme";
export const colors = {
  primary: ui.primary,
  primaryDark: ui.primaryStrong,
  primarySoft: ui.accent,
  background: ui.bg,
  surface: ui.white,
  surfaceMuted: ui.bgCool,
  textPrimary: ui.ink,
  textSecondary: ui.body,
  textMuted: ui.muted,
  border: ui.line,
  divider: ui.sidebarBorder,
  success: ui.success,
  warning: ui.warning,
  danger: ui.danger,
  info: "#1d6fc2",
  purple: ui.orange,
} as const;
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;
export const radius = { sm: 10, md: 12, lg: 16, xl: 20, pill: 999 } as const;
export const shadow = {
  shadowColor: ui.ink,
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
