const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function compile(path, mocks = {}, env = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      require(name) {
        if (!(name in mocks)) throw Error(name);
        return mocks[name];
      },
      process: { env },
      setTimeout,
      Date,
    },
  );
  return exports;
}
const { MobileCallController, permissionFresh } = compile(
  "src/calling/controller.ts",
);
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const state = () => ({
  mode: "live",
  calls: [],
  senders: [{ phoneNumberId: "qa-sender", displayPhoneNumber: "+15550000001" }],
  outboundCalling: { enabled: true },
  allowance: { eligible: true, remaining: 10, active: 0, concurrentCalls: 1 },
});
const call = { id: "qa-call", status: "RINGING", direction: "INBOUND" };
const target = { phoneNumberId: "qa-sender", recipient: "+15550000002" };
const permission = () => ({
  canCall: true,
  checkedAt: new Date().toISOString(),
});
function harness(handler = () => undefined, createError = false) {
  const requests = [],
    events = [];
  let authorized = true,
    foreground = true;
  const media = {
    async prepare() {
      events.push("prepare");
    },
    async answer() {
      events.push("answer");
      return "qa-answer";
    },
    async offer() {
      events.push("offer");
      return "qa-offer";
    },
    async connected() {
      events.push("connected");
    },
    async applyAnswer() {
      events.push("applyAnswer");
    },
    mute(value) {
      events.push(`mute:${value}`);
    },
    close() {
      events.push("close");
    },
  };
  const controller = new MobileCallController(
    async (path, body) => {
      requests.push({ path, body });
      const result = handler(path, body);
      if (result !== undefined) return result;
      if (path.endsWith("/permission")) return permission();
      if (path.endsWith("/outbound")) return { id: "qa-call" };
      if (body.action === "claim") return { offer: "qa-offer" };
      return {};
    },
    () => {
      if (createError) throw Error("Native audio unavailable");
      return media;
    },
    () => {},
    () => authorized,
    () => foreground,
  );
  return {
    controller,
    requests,
    media,
    events,
    revoke() {
      authorized = false;
    },
    background() {
      foreground = false;
    },
  };
}
test("inbound negotiates before acceptance; mute and end release audio, with no recording", async () => {
  const h = harness();
  await h.controller.answer(call, state());
  assert.equal(h.controller.activeId, call.id);
  assert.deepEqual(
    h.requests.map((r) => r.body.action),
    ["claim", "pre_accept", "accept"],
  );
  assert.deepEqual(h.events, ["prepare", "answer", "connected", "mute:false"]);
  h.controller.toggleMute();
  assert.equal(h.controller.muted, true);
  h.controller.toggleMute();
  assert.equal(h.controller.muted, false);
  await h.controller.end();
  assert.equal(h.controller.activeId, null);
  assert.equal(h.events.at(-1), "close");
  assert.equal(h.requests.at(-1).body.action, "terminate");
  assert.ok(h.requests.every((r) => !r.path.includes("recording")));
});
test("microphone denial and missing native audio never claim a call or stick the lock", async () => {
  for (const factoryError of [false, true]) {
    const h = harness(undefined, factoryError);
    h.media.prepare = async () => {
      throw Error("Microphone denied");
    };
    await assert.rejects(h.controller.answer(call, state()));
    assert.equal(h.requests.length, 0);
    assert.equal(h.controller.busy, false);
  }
});
test("duplicate answer taps cannot double-claim or allocate two microphones", async () => {
  const wait = deferred(),
    h = harness();
  h.media.prepare = () => wait.promise;
  const answer = h.controller.answer(call, state());
  await assert.rejects(h.controller.answer(call, state()), /progress/);
  wait.resolve();
  await answer;
  assert.equal(h.requests.filter((r) => r.body.action === "claim").length, 1);
  await h.controller.end();
});
test("backgrounding during microphone permission prevents claim and closes audio", async () => {
  const wait = deferred(),
    h = harness();
  h.media.prepare = () => wait.promise;
  const answer = h.controller.answer(call, state());
  h.background();
  await h.controller.end();
  wait.resolve();
  await assert.rejects(answer, /cancelled/);
  assert.equal(h.requests.length, 0);
  assert.ok(h.events.includes("close"));
});
test("a late claim after cancellation is terminated without acceptance", async () => {
  const wait = deferred(),
    entered = deferred(),
    h = harness((path, body) => {
      if (body.action === "claim") {
        entered.resolve();
        return wait.promise;
      }
    });
  const answer = h.controller.answer(call, state());
  await entered.promise;
  await h.controller.end();
  wait.resolve({ offer: "qa-offer" });
  await assert.rejects(answer);
  assert.deepEqual(
    h.requests.map((r) => r.body.action),
    ["claim", "terminate"],
  );
});
test("account changes never send old call actions using the new session", async () => {
  const wait = deferred(),
    entered = deferred(),
    h = harness((path, body) => {
      if (body.action === "claim") {
        entered.resolve();
        return wait.promise;
      }
    });
  const answer = h.controller.answer(call, state());
  await entered.promise;
  h.revoke();
  h.controller.dispose();
  wait.resolve({ offer: "qa-offer" });
  await assert.rejects(answer);
  assert.deepEqual(
    h.requests.map((r) => r.body.action),
    ["claim"],
  );
  assert.ok(h.events.includes("close"));
});
test("failed inbound negotiation terminates reservation and releases microphone", async () => {
  const h = harness();
  h.media.answer = async () => {
    throw Error("SDP rejected");
  };
  await assert.rejects(h.controller.answer(call, state()), /SDP/);
  assert.equal(h.requests.at(-1).body.action, "terminate");
  assert.equal(h.controller.activeId, null);
});
test("disabled, expired, exhausted and busy policies fail before microphone access", async () => {
  for (const override of [
    { mode: "disabled" },
    { allowance: { eligible: false } },
    { allowance: { eligible: true, remaining: 0 } },
    {
      allowance: {
        eligible: true,
        remaining: 2,
        active: 1,
        concurrentCalls: 1,
      },
    },
  ]) {
    const h = harness();
    await assert.rejects(
      h.controller.answer(call, { ...state(), ...override }),
    );
    assert.equal(h.events.length, 0);
    assert.equal(h.requests.length, 0);
  }
});
test("outbound checks permission before microphone; signed answer unlocks outgoing audio", async () => {
  const h = harness((path, body) =>
    body.action === "signal"
      ? { answer: "qa-answer", status: "ACTIVE" }
      : undefined,
  );
  await h.controller.start(target, "request-1", state());
  assert.deepEqual(
    h.requests.map((r) => r.path),
    ["/whatsapp-calls/outbound/permission", "/whatsapp-calls/outbound"],
  );
  assert.ok(!h.events.includes("mute:false"));
  await h.controller.tick({
    ...state(),
    calls: [{ ...call, direction: "OUTBOUND", status: "ACTIVE" }],
  });
  assert.ok(h.events.includes("applyAnswer"));
  assert.ok(h.events.includes("mute:false"));
  await h.controller.end();
});
test("permission denial, stale or future checks cannot place a call", async () => {
  for (const p of [
    { ...permission(), canCall: false },
    { ...permission(), checkedAt: "invalid" },
    { ...permission(), checkedAt: new Date(Date.now() - 60000).toISOString() },
    { ...permission(), checkedAt: new Date(Date.now() + 60000).toISOString() },
  ]) {
    const h = harness((path) => (path.endsWith("/permission") ? p : undefined));
    await assert.rejects(h.controller.start(target, "request-1", state()));
    assert.equal(h.events.includes("prepare"), false);
    assert.equal(h.requests.length, 1);
  }
  assert.equal(permissionFresh(permission()), true);
});
test("inaccessible sender and malformed number fail before sending any request", async () => {
  for (const t of [
    { ...target, phoneNumberId: "foreign" },
    { ...target, recipient: "IN.123456789012" },
  ]) {
    const h = harness();
    await assert.rejects(h.controller.start(t, "request-1", state()));
    assert.equal(h.requests.length, 0);
  }
});
test("uncertain outbound results close audio and are not automatically redialled", async () => {
  const h = harness((path) =>
    path.endsWith("/outbound") ? { id: "qa-call", uncertain: true } : undefined,
  );
  await assert.rejects(
    h.controller.start(target, "stable-id", state()),
    /uncertain/,
  );
  assert.equal(
    h.requests.filter((r) => r.path.endsWith("/outbound")).length,
    1,
  );
  assert.equal(h.requests.at(-1).body.action, "terminate");
  assert.ok(h.events.includes("close"));
});
test("remote termination closes local audio without starting a new call", async () => {
  const h = harness();
  await h.controller.answer(call, state());
  await h.controller.tick({
    ...state(),
    calls: [{ ...call, status: "COMPLETED" }],
  });
  assert.equal(h.controller.activeId, null);
  assert.equal(h.events.at(-1), "close");
});
test("late signaling cannot close a newer call after hang-up", async () => {
  const wait = deferred();
  const h = harness((path, body) =>
    body.action === "signal" ? wait.promise : undefined,
  );
  await h.controller.start(target, "request-1", state());
  const tick = h.controller.tick({
    ...state(),
    calls: [{ ...call, direction: "OUTBOUND", status: "CONNECTING" }],
  });
  await Promise.resolve();
  await h.controller.end();
  await h.controller.answer({ ...call, id: "new-call" }, state());
  wait.resolve({ answer: "qa-answer", status: "ACTIVE" });
  await assert.rejects(tick);
  assert.equal(h.controller.activeId, "new-call");
  await h.controller.end();
});
test("native audio is opt-in and unavailable in Expo Go or web; no recording implementation", () => {
  for (const [flag, module, os, expected] of [
    [undefined, true, "android", false],
    ["true", false, "ios", false],
    ["true", true, "web", false],
    ["true", true, "android", true],
  ]) {
    const { nativeCallingAvailable } = compile(
      "src/calling/nativeAudio.ts",
      {
        "react-native": {
          NativeModules: { WebRTCModule: module },
          Platform: { OS: os },
        },
      },
      { EXPO_PUBLIC_NATIVE_CALLING_ENABLED: flag },
    );
    assert.equal(nativeCallingAvailable(), expected);
  }
  const source = fs.readFileSync("src/calling/nativeAudio.ts", "utf8");
  assert.match(source, /audio: true,\s+video: false/);
  assert.doesNotMatch(
    source,
    /MediaRecorder|startRecording|getDisplayMedia|recording\/consent/,
  );
});
test("native build configuration keeps production off and grants microphone only in QA opt-in", () => {
  const config = require("../app.json").expo;
  const build = require("../app.config.js");
  const previous = process.env.EXPO_PUBLIC_NATIVE_CALLING_ENABLED;
  try {
    delete process.env.EXPO_PUBLIC_NATIVE_CALLING_ENABLED;
    const regular = build({ config });
    assert.ok(
      regular.android.blockedPermissions.includes(
        "android.permission.RECORD_AUDIO",
      ),
    );
    process.env.EXPO_PUBLIC_NATIVE_CALLING_ENABLED = "true";
    const qa = build({ config });
    assert.ok(
      !qa.android.blockedPermissions.includes(
        "android.permission.RECORD_AUDIO",
      ),
    );
    assert.ok(
      qa.android.blockedPermissions.includes(
        "android.permission.SYSTEM_ALERT_WINDOW",
      ),
    );
    assert.ok(
      qa.plugins.some(
        (p) =>
          Array.isArray(p) && p[0] === "@config-plugins/react-native-webrtc",
      ),
    );
  } finally {
    if (previous === undefined)
      delete process.env.EXPO_PUBLIC_NATIVE_CALLING_ENABLED;
    else process.env.EXPO_PUBLIC_NATIVE_CALLING_ENABLED = previous;
  }
});
test("native audio uses audio-only tracks, gathers SDP, and releases microphone on close", async () => {
  const events = [],
    track = {
      enabled: true,
      stop() {
        events.push("stop");
      },
    };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  class Peer {
    iceGatheringState = "complete";
    connectionState = "connected";
    addTrack(t, s) {
      assert.equal(t, track);
      assert.equal(s, stream);
    }
    async setRemoteDescription(sdp) {
      events.push(sdp.type);
    }
    async createAnswer() {
      return { type: "answer", sdp: "local-answer" };
    }
    async createOffer() {
      return { type: "offer", sdp: "local-offer" };
    }
    async setLocalDescription(sdp) {
      this.localDescription = sdp;
    }
    close() {
      events.push("peer-close");
    }
  }
  const { NativeAudioSession } = compile(
    "src/calling/nativeAudio.ts",
    {
      "react-native": {
        NativeModules: { WebRTCModule: {} },
        Platform: { OS: "android" },
      },
      "react-native-webrtc": {
        RTCPeerConnection: Peer,
        mediaDevices: {
          async getUserMedia(constraints) {
            assert.equal(constraints.audio, true);
            assert.equal(constraints.video, false);
            return stream;
          },
        },
      },
    },
    { EXPO_PUBLIC_NATIVE_CALLING_ENABLED: "true" },
  );
  const audio = new NativeAudioSession();
  await audio.prepare();
  assert.equal(track.enabled, false);
  assert.equal(await audio.answer("remote-offer"), "local-answer");
  await audio.connected();
  audio.mute(false);
  assert.equal(track.enabled, true);
  audio.mute(true);
  assert.equal(track.enabled, false);
  audio.close();
  assert.deepEqual(events, ["offer", "stop", "peer-close"]);
});
test("late microphone permission grant cannot keep capture open after cancellation", async () => {
  const wait = deferred();
  let stopped = 0;
  const track = {
    enabled: true,
    stop() {
      stopped++;
    },
  };
  const { NativeAudioSession } = compile(
    "src/calling/nativeAudio.ts",
    {
      "react-native": {
        NativeModules: { WebRTCModule: {} },
        Platform: { OS: "ios" },
      },
      "react-native-webrtc": {
        mediaDevices: { getUserMedia: () => wait.promise },
      },
    },
    { EXPO_PUBLIC_NATIVE_CALLING_ENABLED: "true" },
  );
  const audio = new NativeAudioSession();
  const prepared = audio.prepare();
  audio.close();
  wait.resolve({ getTracks: () => [track] });
  await assert.rejects(prepared, /cancelled/);
  assert.equal(stopped, 1);
});
test("generated native configuration preserves microphone permission only in calling QA builds", () => {
  const { spawnSync } = require("node:child_process");
  for (const enabled of ["false", "true"]) {
    const result = spawnSync(
      process.execPath,
      ["node_modules/expo/bin/cli", "config", "--type", "introspect", "--json"],
      {
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          EXPO_OFFLINE: "1",
          EXPO_PUBLIC_NATIVE_CALLING_ENABLED: enabled,
        },
      },
    );
    assert.equal(result.status, 0, result.stderr);
    const config = JSON.parse(result.stdout);
    const permission =
      config._internal.modResults.ios.infoPlist.NSMicrophoneUsageDescription;
    assert.equal(Boolean(permission), enabled === "true");
    assert.equal(
      config.android.blockedPermissions.includes(
        "android.permission.RECORD_AUDIO",
      ),
      enabled !== "true",
    );
  }
});
test("audio connection failure terminates server ownership and releases capture", async () => {
  const h = harness();
  await h.controller.answer(call, state());
  h.media.checkConnection = () => {
    throw Error("Connection lost");
  };
  await assert.rejects(
    h.controller.tick({ ...state(), calls: [{ ...call, status: "ACTIVE" }] }),
    /Connection lost/,
  );
  assert.equal(h.controller.activeId, null);
  assert.equal(h.requests.at(-1).body.action, "terminate");
  assert.equal(h.events.at(-1), "close");
});
