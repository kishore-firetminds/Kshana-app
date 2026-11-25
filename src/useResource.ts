import { useCallback, useRef, useState } from "react";
import axios from "axios";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "./api";
import { ApiError, errorMessage } from "./api/client";
import { useAppStore } from "./store";

/** Fetch on focus/foreground, cancel on blur, and never overwrite a newer query. */
export function useResource<T>(
  path: string | null,
  pollMs = 0,
  scopeKey = "",
  phoneNumberId?: string,
) {
  const account = useAppStore((state) =>
    state.user ? `${state.user.organizationId}:${state.user.id}` : "",
  );
  const key = path
    ? JSON.stringify([path, scopeKey, phoneNumberId, account])
    : null;
  const [state, setState] = useState<{
    path: string | null;
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({ path: key, data: null, loading: Boolean(path), error: null });
  const active = useRef(false);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const refresh = useCallback(async () => {
    if (!path || !active.current) return;
    const request = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    inFlight.current = true;
    setState((previous) => ({
      path: key,
      data: previous.path === key ? previous.data : null,
      loading: true,
      error: null,
    }));
    try {
      const data = await api.request<T>(path, {
        signal: abort.signal,
        ...(phoneNumberId
          ? { headers: { "x-whatsapp-phone-number-id": phoneNumberId } }
          : {}),
      });
      if (active.current && request === sequence.current)
        setState({ path: key, data, loading: false, error: null });
    } catch (error) {
      if (
        !abort.signal.aborted &&
        active.current &&
        request === sequence.current
      )
        setState((previous) => ({
          ...previous,
          path: key,
          data: [401, 403, 404].includes(
            axios.isAxiosError(error)
              ? (error.response?.status ?? 0)
              : error instanceof ApiError
                ? error.status
                : 0,
          )
            ? null
            : previous.data,
          loading: false,
          error: errorMessage(error),
        }));
    } finally {
      if (request === sequence.current) inFlight.current = false;
    }
  }, [path, key, phoneNumberId]);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      void refresh();
      const subscription = AppState.addEventListener("change", (value) => {
        if (value === "active") void refresh();
        else controller.current?.abort();
      });
      const timer = pollMs
        ? setInterval(() => {
            if (AppState.currentState === "active" && !inFlight.current)
              void refresh();
          }, pollMs)
        : undefined;
      return () => {
        active.current = false;
        inFlight.current = false;
        sequence.current++;
        controller.current?.abort();
        subscription.remove();
        if (timer) clearInterval(timer);
      };
    }, [refresh, pollMs]),
  );
  const current =
    state.path === key
      ? state
      : { data: null, loading: Boolean(path), error: null };
  return { ...current, refresh };
}
