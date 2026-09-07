export const colors = {
  primary: "#16C768",
  primaryDark: "#08783F",
  primarySoft: "#E8F9F0",
  background: "#F7F9FC",
  surface: "#FFFFFF",
  surfaceMuted: "#F2F5F8",
  textPrimary: "#10182F",
  textSecondary: "#667085",
  textMuted: "#98A2B3",
  border: "#E6EAF0",
  divider: "#EEF1F4",
  success: "#16C768",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#4F7CFF",
  purple: "#7C5CFC",
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
  shadowColor: "#10182F",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
