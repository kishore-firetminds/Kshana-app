import { NativeModules, Platform } from "react-native";
import type { AudioSession } from "./controller";
import type {
  MediaStream,
  RTCPeerConnection as Peer,
} from "react-native-webrtc";

export function nativeCallingAvailable() {
  return (
    process.env.EXPO_PUBLIC_NATIVE_CALLING_ENABLED === "true" &&
    Platform.OS !== "web" &&
    Boolean(NativeModules.WebRTCModule)
  );
}

export class NativeAudioSession implements AudioSession {
  private stream: MediaStream | null = null;
  private peer: Peer | null = null;
  private closed = false;
  private disconnectedAt = 0;
  async prepare() {
    if (this.closed || !nativeCallingAvailable())
      throw Error("Install the native calling QA build first.");
    const { mediaDevices } =
      require("react-native-webrtc") as typeof import("react-native-webrtc");
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    if (this.closed) {
      stream.getTracks().forEach((t) => t.stop());
      throw Error("Call cancelled.");
    }
    this.stream = stream;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = false;
    });
  }
  private createPeer() {
    if (this.closed || !this.stream) throw Error("Microphone is not ready.");
    const { RTCPeerConnection } =
      require("react-native-webrtc") as typeof import("react-native-webrtc");
    const peer = new RTCPeerConnection({ iceServers: [] });
    this.peer = peer;
    this.stream.getTracks().forEach((t) => peer.addTrack(t, this.stream!));
    return peer;
  }
  private async wait(test: () => boolean, milliseconds: number) {
    const end = Date.now() + milliseconds;
    while (!test()) {
      if (
        this.closed ||
        !this.peer ||
        ["failed", "closed"].includes(this.peer.connectionState) ||
        Date.now() >= end
      )
        throw Error("Call audio connection failed or timed out.");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (this.closed) throw Error("Call cancelled.");
  }
  private async localSdp() {
    await this.wait(() => this.peer?.iceGatheringState === "complete", 10000);
    const sdp = this.peer?.localDescription?.sdp;
    if (!sdp) throw Error("Audio negotiation failed.");
    return sdp;
  }
  async answer(sdp: string) {
    const peer = this.createPeer();
    await peer.setRemoteDescription({ type: "offer", sdp });
    await peer.setLocalDescription(await peer.createAnswer());
    return this.localSdp();
  }
  async offer() {
    const peer = this.createPeer();
    await peer.setLocalDescription(
      await peer.createOffer({ offerToReceiveAudio: true }),
    );
    return this.localSdp();
  }
  async applyAnswer(sdp: string) {
    if (!this.peer || this.closed) throw Error("Call has ended.");
    await this.peer.setRemoteDescription({ type: "answer", sdp });
    await this.connected();
  }
  async connected() {
    await this.wait(() => this.peer?.connectionState === "connected", 15000);
  }
  mute(value: boolean) {
    if (!value && this.peer?.connectionState !== "connected") return;
    this.stream?.getAudioTracks().forEach((t) => {
      t.enabled = !value;
    });
  }
  checkConnection() {
    if (
      this.closed ||
      !this.peer ||
      ["failed", "closed"].includes(this.peer.connectionState)
    )
      throw Error("Call audio disconnected.");
    if (this.peer.connectionState === "disconnected") {
      this.disconnectedAt ||= Date.now();
      if (Date.now() - this.disconnectedAt > 15000)
        throw Error("Call audio could not reconnect.");
    } else this.disconnectedAt = 0;
  }
  close() {
    this.closed = true;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.peer?.close();
    this.peer = null;
    this.stream = null;
  }
}
