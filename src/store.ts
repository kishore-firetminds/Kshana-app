import { create } from "zustand";
type AppState = {
  authenticated: boolean;
  workspace: string;
  login: () => void;
  logout: () => void;
};
export const useAppStore = create<AppState>((set) => ({
  authenticated: false,
  workspace: "Fireside Labs",
  login: () => set({ authenticated: true }),
  logout: () => set({ authenticated: false }),
}));
