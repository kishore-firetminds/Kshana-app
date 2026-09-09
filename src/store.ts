import { create } from "zustand";
import { api } from "./api";
import { loadMobilePreferences, unregisterPush } from "./mobileServices";
import { errorMessage } from "./api/client";
import type { CurrentUser } from "./api/types";
type AppState = {
  authenticated: boolean;
  workspace: string;
  user: CurrentUser | null;
  restoring: boolean;
  restoreError: string | null;
  login: (
    email: string,
    password: string,
    organizationSlug?: string,
    remember?: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  refreshUser: () => Promise<void>;
};
export const useAppStore = create<AppState>((set) => ({
  authenticated: false,
  workspace: "",
  user: null,
  restoring: true,
  restoreError: null,
  async login(email, password, slug = "", remember = true) {
    const user = await api.login(email, password, slug, remember);
    set({
      user,
      authenticated: true,
      workspace: user.organization?.name || "Workspace",
      restoreError: null,
    });
  },
  async logout() {
    await unregisterPush(false).catch(() => {});
    await loadMobilePreferences(null);
    await api.logout();
  },
  async restore() {
    set({ restoring: true, restoreError: null });
    try {
      const user = await api.restore();
      set({
        user,
        authenticated: Boolean(user),
        workspace: user?.organization?.name || "",
      });
    } catch (error) {
      set({ restoreError: errorMessage(error) });
    } finally {
      set({ restoring: false });
    }
  },
  async refreshUser() {
    const user = await api.get<CurrentUser>("/auth/me");
    set({ user, workspace: user.organization?.name || "Workspace" });
  },
}));
api.onSessionExpired = () =>
  useAppStore.setState({
    authenticated: false,
    user: null,
    workspace: "",
    restoreError: null,
  });
