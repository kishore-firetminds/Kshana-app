import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import type { CurrentUser, Tokens } from "./types";
export type SavedSession = { baseUrl: string; tokens: Tokens };
export type SessionStorage = {
  read: () => Promise<SavedSession | null>;
  write: (session: SavedSession | null) => Promise<void>;
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}
export function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join("\n");
    if (!error.response)
      return "Unable to reach KshanaAPI. Check your connection and try again.";
    if (error.response.status === 403)
      return "Your account does not have access to this action.";
  }
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
export function unwrap<T>(payload: unknown): T {
  if (!payload || typeof payload !== "object")
    throw new ApiError("The server returned an unexpected response.");
  const envelope = payload as { success?: boolean; message?: string; data?: T };
  if (envelope.success === false)
    throw new ApiError(envelope.message || "Request failed.");
  return ("data" in envelope ? envelope.data : payload) as T;
}
/** The Next.js proxy reads a cookie; direct NestJS deployments read Authorization.
 * Native requests explicitly supply the token. Tokens never enter URLs.
 */
export class ApiClient {
  private tokens: Tokens | null = null;
  private remember = false;
  private epoch = 0;
  private refreshing: Promise<void> | null = null;
  private storageQueue: Promise<void> = Promise.resolve();
  onSessionExpired = () => {};
  readonly http: AxiosInstance;
  constructor(
    readonly baseUrl: string,
    private storage: SessionStorage,
    http?: AxiosInstance,
  ) {
    this.http =
      http ??
      axios.create({
        baseURL: baseUrl,
        timeout: 25000,
        withCredentials: false,
      });
  }
  private headers(token?: string) {
    if (!token) return {};
    return /\/api\/backend\/?$/.test(this.baseUrl)
      ? { Cookie: `dealnexus_access_token=${encodeURIComponent(token)}` }
      : { Authorization: `Bearer ${token}` };
  }
  private persist() {
    const value =
      this.remember && this.tokens
        ? { baseUrl: this.baseUrl, tokens: { ...this.tokens } }
        : null;
    this.storageQueue = this.storageQueue
      .catch(() => {})
      .then(() => this.storage.write(value));
    return this.storageQueue;
  }
  private async raw<T>(
    path: string,
    config: AxiosRequestConfig = {},
    token?: string,
  ): Promise<T> {
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("://"))
      throw new ApiError("Invalid API path.");
    const response = await this.http.request({
      ...config,
      url: path,
      headers: { ...config.headers, ...this.headers(token) },
    });
    return unwrap<T>(response.data);
  }
  async request<T>(path: string, config: AxiosRequestConfig = {}): Promise<T> {
    const epoch = this.epoch;
    const token = this.tokens?.accessToken;
    if (!token) throw new ApiError("Please sign in to continue.", 401);
    try {
      const result = await this.raw<T>(path, config, token);
      if (epoch !== this.epoch) throw new ApiError("Session changed.", 401);
      return result;
    } catch (error) {
      if (
        !axios.isAxiosError(error) ||
        error.response?.status !== 401 ||
        epoch !== this.epoch
      )
        throw error;
      if (this.tokens?.accessToken === token) await this.refresh();
      if (epoch !== this.epoch || !this.tokens)
        throw new ApiError("Please sign in again.", 401);
      try {
        const result = await this.raw<T>(path, config, this.tokens.accessToken);
        if (epoch !== this.epoch) throw new ApiError("Session changed.", 401);
        return result;
      } catch (retryError) {
        if (
          axios.isAxiosError(retryError) &&
          retryError.response?.status === 401 &&
          epoch === this.epoch
        )
          await this.clear();
        throw retryError;
      }
    }
  }
  get<T>(path: string) {
    return this.request<T>(path);
  }
  post<T>(path: string, data?: unknown) {
    return this.request<T>(path, { method: "POST", data });
  }
  patch<T>(path: string, data: unknown) {
    return this.request<T>(path, { method: "PATCH", data });
  }
  async login(
    email: string,
    password: string,
    organizationSlug: string,
    remember: boolean,
  ) {
    const epoch = ++this.epoch;
    this.refreshing = null;
    const tokens = await this.raw<Tokens>("/auth/login", {
      method: "POST",
      data: {
        email: email.trim(),
        password,
        ...(organizationSlug.trim()
          ? { organizationSlug: organizationSlug.trim() }
          : {}),
      },
    });
    if (epoch !== this.epoch) throw new ApiError("Sign-in was cancelled.");
    if (!tokens.accessToken || !tokens.refreshToken)
      throw new ApiError("The server did not return a valid session.");
    this.tokens = tokens;
    this.remember = remember;
    try {
      const user = await this.get<CurrentUser>("/auth/me");
      await this.persist();
      if (epoch !== this.epoch) throw new ApiError("Sign-in was cancelled.");
      return user;
    } catch (error) {
      if (epoch === this.epoch) await this.clear();
      throw error;
    }
  }
  async restore() {
    const saved = await this.storage.read();
    if (
      !saved ||
      saved.baseUrl !== this.baseUrl ||
      !saved.tokens?.refreshToken ||
      !saved.tokens?.accessToken
    )
      return null;
    this.tokens = saved.tokens;
    this.remember = true;
    try {
      return await this.get<CurrentUser>("/auth/me");
    } catch (error) {
      if (!this.tokens) return null;
      throw error;
    }
  }
  private refresh() {
    if (this.refreshing) return this.refreshing;
    const epoch = this.epoch;
    const tokens = this.tokens;
    const pending = (async () => {
      if (!tokens) throw new ApiError("Please sign in again.", 401);
      try {
        const next = await this.raw<Tokens>("/auth/refresh", {
          method: "POST",
          data: tokens,
        });
        if (epoch !== this.epoch) throw new ApiError("Session changed.", 401);
        if (!next.accessToken)
          throw new ApiError("The server did not return a valid session.");
        this.tokens = {
          accessToken: next.accessToken,
          refreshToken: next.refreshToken || tokens.refreshToken,
        };
        await this.persist();
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          [400, 401, 403].includes(error.response?.status ?? 0) &&
          epoch === this.epoch
        )
          await this.clear();
        throw error;
      }
    })();
    this.refreshing = pending;
    void pending
      .finally(() => {
        if (this.refreshing === pending) this.refreshing = null;
      })
      .catch(() => {});
    return pending;
  }
  async clear() {
    this.epoch++;
    this.tokens = null;
    this.remember = false;
    this.refreshing = null;
    this.onSessionExpired();
    await this.persist();
  }
  async logout() {
    const tokens = this.tokens;
    await this.clear();
    if (!tokens) return;
    try {
      await this.raw("/auth/logout", { method: "POST" }, tokens.accessToken);
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 401)
        throw error;
      // The embedded workspace may have refreshed the same server session.
      // Revoke it without restoring the locally cleared account.
      const next = await this.raw<Tokens>("/auth/refresh", {
        method: "POST",
        data: tokens,
      });
      await this.raw("/auth/logout", { method: "POST" }, next.accessToken);
    }
  }
  workspaceSource(siteUrl: string) {
    const site = new URL(siteUrl);
    if (site.origin !== new URL(this.baseUrl).origin)
      throw new ApiError(
        "The workspace and API must use the same trusted origin.",
      );
    if (
      site.protocol !== "https:" ||
      site.username ||
      site.password ||
      site.pathname !== "/" ||
      site.search ||
      site.hash
    )
      throw new ApiError("The workspace must use a secure site origin.");
    if (!this.tokens) throw new ApiError("Please sign in to continue.", 401);
    return {
      uri: `${site.origin}/api/auth/socket-token`,
      headers: {
        Cookie: `dealnexus_access_token=; dealnexus_refresh_token=${encodeURIComponent(this.tokens.refreshToken)}; dealnexus_remember_me=0`,
      },
    };
  }
  async prepareWorkspace(siteUrl: string) {
    const epoch = this.epoch;
    const source = this.workspaceSource(siteUrl);
    // RN's native cookie store receives the server's HttpOnly cookies. On
    // Android this runs after the empty WebView has cleared its old cookies.
    const response = await this.http.get(source.uri, {
      headers: source.headers,
      withCredentials: true,
    });
    if (epoch !== this.epoch || !this.tokens)
      throw new ApiError("Session changed.", 401);
    if (response.data?.success !== true || !response.data?.accessToken)
      throw new ApiError("Could not open the workspace session.");
    this.tokens = { ...this.tokens, accessToken: response.data.accessToken };
    await this.persist();
    if (epoch !== this.epoch) throw new ApiError("Session changed.", 401);
  }
  forgotPassword(email: string, organizationSlug: string) {
    return this.raw<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      data: {
        email: email.trim(),
        ...(organizationSlug.trim()
          ? { organizationSlug: organizationSlug.trim() }
          : {}),
      },
    });
  }
}
