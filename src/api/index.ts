import * as SecureStore from "expo-secure-store";
import { ApiClient, SavedSession } from "./client";
export const SITE_URL = (
  process.env.EXPO_PUBLIC_SITE_URL || "https://kshanaapi.com"
).replace(/\/+$/, "");
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || `${SITE_URL}/api/backend`
).replace(/\/+$/, "");
const SESSION_KEY = "kshana.mobile.session";
export const api = new ApiClient(API_URL, {
  async read() {
    const value = await SecureStore.getItemAsync(SESSION_KEY);
    if (!value) return null;
    try {
      return JSON.parse(value) as SavedSession;
    } catch {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return null;
    }
  },
  async write(session) {
    if (session)
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    else await SecureStore.deleteItemAsync(SESSION_KEY);
  },
});
