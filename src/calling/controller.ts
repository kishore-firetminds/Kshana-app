export type MobileCall = {
  id: string;
  callerName: string;
  callerPhone?: string | null;
  status: string;
  direction?: string;
  simulated?: boolean;
  agentId?: string | null;
  durationSeconds: number;
  createdAt: string;
  conversationId: string | null;
};
export type CallingState = {
  mode: "disabled" | "local" | "live";
  senders?: { phoneNumberId: string; displayPhoneNumber: string }[];
  outboundCalling?: { enabled: boolean; reason?: string };
  allowance?: {
    eligible: boolean;
    remaining: number;
    active: number;
    concurrentCalls: number;
    expiresAt: string | null;
  };
  calls: MobileCall[];
};
export type CallTarget = {
  phoneNumberId: string;
  recipient: string;
  conversationId?: string;
};
export type CallPermission = {
  status: string;
  canCall: boolean;
  canRequest: boolean;
  windowOpen: boolean;
  checkedAt: string;
  expiresAt: string | null;
  templates: { id: string; name: string; language: string }[];
};
export type AudioSession = {
  prepare(): Promise<void>;
  answer(sdp: string): Promise<string>;
  offer(): Promise<string>;
  applyAnswer(sdp: string): Promise<void>;
  connected(): Promise<void>;
  mute(value: boolean): void;
  checkConnection?(): void;
  close(): void;
};
type Transport = <T>(path: string, body: unknown) => Promise<T>;
const terminal = new Set([
  "COMPLETED",
  "MISSED",
  "DECLINED",
  "FAILED",
  "ENDING",
]);
export const callEnded = (status: string) => terminal.has(status);
export function callingBlocked(state: CallingState) {
  if (state.mode !== "live" || !state.allowance?.eligible)
    return "Calling is not enabled for this workspace.";
  if (state.allowance.remaining <= 0)
    return "The calling allowance has been used.";
  if (state.allowance.active >= state.allowance.concurrentCalls)
    return "All simultaneous call slots are in use.";
  return null;
}
export function permissionFresh(permission: CallPermission, now = Date.now()) {
  const age = now - Date.parse(permission.checkedAt);
  return Number.isFinite(age) && age >= 0 && age <= 30000;
}

// One controller is owned by one authenticated workspace session, across screens.
// Audio and SDP are never persisted and no recording API is available here.
export class MobileCallController {
  activeId: string | null = null;
  busy = false;
  muted = false;
  private disposed = false;
  private media: AudioSession | null = null;
  private generation = 0;
  constructor(
    private readonly post: Transport,
    private readonly createAudio: () => AudioSession,
    private readonly changed: () => void,
    private readonly authorized: () => boolean,
    private readonly foreground: () => boolean = () => true,
  ) {}
  private check(generation: number) {
    if (
      this.disposed ||
      !this.authorized() ||
      !this.foreground() ||
      generation !== this.generation
    )
      throw Error("Call cancelled because access or app state changed.");
  }
  private action<T = { offer?: string; answer?: string; status?: string }>(
    id: string,
    action: string,
    extra = {},
  ) {
    return this.post<T>(`/whatsapp-calls/${encodeURIComponent(id)}/actions`, {
      action,
      ...extra,
    });
  }
  private async terminate(id: string) {
    // Never issue an old workspace's action with a new account's session.
    if (this.authorized())
      await this.action(id, "terminate").catch(() => undefined);
  }
  private clear() {
    this.media?.close();
    this.media = null;
    this.activeId = null;
    this.muted = false;
    this.answered = false;
    this.signalStartedAt = 0;
  }
  async answer(call: MobileCall, state: CallingState) {
    if (this.busy || this.activeId)
      throw Error("Another call action is in progress.");
    const blocked = callingBlocked(state);
    if (
      blocked ||
      call.status !== "RINGING" ||
      call.direction === "OUTBOUND" ||
      call.simulated
    )
      throw Error(blocked || "This call cannot be answered.");
    this.busy = true;
    this.changed();
    const generation = ++this.generation;
    let claimed: string | null = null;
    try {
      this.check(generation);
      const media = this.createAudio();
      this.media = media;
      await media.prepare();
      this.check(generation);
      const result = await this.action(call.id, "claim");
      claimed = call.id;
      this.check(generation);
      if (!result.offer) throw Error("The audio offer is unavailable.");
      this.activeId = call.id;
      this.changed();
      const sdp = await media.answer(result.offer);
      this.check(generation);
      await this.action(call.id, "pre_accept", { sdp });
      this.check(generation);
      await media.connected();
      this.check(generation);
      await this.action(call.id, "accept", { sdp });
      this.check(generation);
      media.mute(false);
    } catch (error) {
      this.clear();
      if (claimed) await this.terminate(claimed);
      throw error;
    } finally {
      this.busy = false;
      this.changed();
    }
  }
  async start(target: CallTarget, requestId: string, state: CallingState) {
    if (this.busy || this.activeId)
      throw Error("Another call action is in progress.");
    const blocked = callingBlocked(state);
    if (blocked || !state.outboundCalling?.enabled)
      throw Error(blocked || "Outbound calling is disabled.");
    if (
      !state.senders?.some((s) => s.phoneNumberId === target.phoneNumberId) ||
      !/^\+[1-9]\d{6,14}$/.test(target.recipient)
    )
      throw Error("Select an accessible sender and a valid customer number.");
    this.busy = true;
    this.changed();
    const generation = ++this.generation;
    let created: string | null = null;
    let media: AudioSession | null = null;
    try {
      this.check(generation);
      const permission = await this.post<CallPermission>(
        "/whatsapp-calls/outbound/permission",
        target,
      );
      this.check(generation);
      if (!permission.canCall || !permissionFresh(permission))
        throw Error(
          "Customer permission is missing, expired or revoked. Refresh permission.",
        );
      media = this.createAudio();
      this.media = media;
      await media.prepare();
      this.check(generation);
      const sdp = await media.offer();
      this.check(generation);
      const result = await this.post<{ id: string; uncertain?: boolean }>(
        "/whatsapp-calls/outbound",
        { ...target, requestId, sdp },
      );
      if (typeof result.id === "string") created = result.id;
      this.check(generation);
      if (!created || result.uncertain)
        throw Error(
          "Call status is uncertain. Check history before trying again.",
        );
      this.activeId = created;
      this.changed();
    } catch (error) {
      this.clear();
      if (created) await this.terminate(created);
      throw error;
    } finally {
      this.busy = false;
      this.changed();
    }
  }
  private polling = false;
  private answered = false;
  private signalStartedAt = 0;
  async tick(state: CallingState) {
    const id = this.activeId,
      media = this.media,
      generation = this.generation;
    if (!id || !media || this.busy || this.polling) return;
    this.polling = true;
    try {
      this.check(generation);
      const call = state.calls.find((c) => c.id === id);
      if (!call || callEnded(call.status)) {
        this.clear();
        return;
      }
      media.checkConnection?.();
      await this.action(id, "heartbeat");
      this.check(generation);
      if (call.direction === "OUTBOUND") {
        this.signalStartedAt ||= Date.now();
        const signal = await this.action(id, "signal");
        this.check(generation);
        if (callEnded(signal.status || "")) {
          this.clear();
          return;
        }
        if (signal.answer && !this.answered) {
          await media.applyAnswer(signal.answer);
          this.check(generation);
          this.answered = true;
        }
        if (this.answered && signal.status === "ACTIVE") media.mute(this.muted);
        else if (Date.now() - this.signalStartedAt > 45000)
          throw Error("No answer or audio connection timed out.");
      }
    } catch (error) {
      if (generation === this.generation) this.clear();
      await this.terminate(id);
      throw error;
    } finally {
      this.polling = false;
      this.changed();
    }
  }
  toggleMute() {
    if (this.activeId) {
      this.muted = !this.muted;
      this.media?.mute(this.muted);
      this.changed();
    }
  }
  async end() {
    ++this.generation;
    const id = this.activeId;
    this.clear();
    this.answered = false;
    this.signalStartedAt = 0;
    this.changed();
    if (id && this.authorized()) await this.action(id, "terminate");
  }
  dispose() {
    this.disposed = true;
    void this.end().catch(() => undefined);
  }
}
