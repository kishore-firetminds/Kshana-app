# Native Calling: Local Implementation and Release Gates

## Implemented Locally

- Voice-only native WebRTC session, using the SDK 54 compatible versions of
  `react-native-webrtc` and its Expo config plugin. Expo Go cannot run this code.
- One controller per authenticated workspace session, shared across app screens.
- Explicit incoming availability, foreground vibration and Answer/Decline.
- Inbound claim, SDP answer, pre-accept, connection wait, then accept. The
  microphone starts disabled and is unmuted only after successful negotiation.
- Customer permission lookup, optional approved-template permission request and
  separate confirmation before outbound dial. Inbox options pin the sender and
  conversation; unavailable sender access never silently switches to another.
- Signed remote-answer polling before enabling outbound microphone transmission.
- Mute/unmute, hang-up, server termination, heartbeat and remote-end cleanup.
- Locks against duplicate setup, stable outbound/request identifiers, no automatic
  redial, no recording API, no audio/SDP persistence, no camera capture.
- Account/permission changes close native media and invalidate pending setup. Old
  call actions are never sent with a new account's session. The server lease
  resolves any reservation that cannot safely be terminated after logout.

The production EAS profile explicitly sets `EXPO_PUBLIC_NATIVE_CALLING_ENABLED`
to `false`. Existing production calling grants, Meta callbacks and recording
settings have not been changed.

## QA Build

Use a development build with `EXPO_PUBLIC_NATIVE_CALLING_ENABLED=true` at both
native build and bundling time. Set the existing public API/site URL variables to
the isolated QA backend and frontend, not production. The corresponding server
must already authorize the QA account and sender under its calling rollout.
The build enables microphone usage; permission is requested only on Answer or
after explicit outbound confirmation. Photo-attachment permissions are preserved.
No new Firebase, Apple signing or Meta credentials are stored in the repository.

Native modules require a rebuilt installable app, not an over-the-air update or
Metro restart alone. Local JavaScript exports are not installable device builds.

## Existing Server Contracts

All paths below are relative to the authenticated app API, not direct Meta APIs.
Authorization, sender access, read-only subscription checks, customer permission,
accepted-call allowance and simultaneous reservations remain server enforced.

| Endpoint                                           | Mobile usage                                                                                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /whatsapp-calls`                              | Accessible calls, senders, allowance and outbound flag. Foreground polling only.                                                                     |
| `POST /whatsapp-calls/:id/actions`                 | Inbound `claim`, `pre_accept` with SDP, `accept` with SDP; explicit `reject`, `terminate`; `heartbeat` and outbound `signal`.                        |
| `POST /whatsapp-calls/outbound/permission`         | `{phoneNumberId, recipient, conversationId?}`. Read authoritative customer call permission; not permission inferred from messaging consent.          |
| `POST /whatsapp-calls/outbound/permission-request` | Target plus UUID `requestId`, and `templateId` outside the service window. Explicit confirmation before sending.                                     |
| `POST /whatsapp-calls/outbound`                    | Target plus stable UUID `requestId` and native SDP offer. Recheck permission before microphone setup. Server checks permission again before dialing. |

Never log SDP, tokens or audio. Do not retry an uncertain outbound response with a
new identifier. Check call history; the server must reconcile signed Meta events.
The embedded web workspace still redirects calling to native rather than exposing
browser-only microphone and recording controls inside WebView.

## Not Implemented: Background and Lock-Screen Calls

Do not describe foreground polling or ordinary Expo notifications as background
VoIP ringing. Until the following work and device tests pass, backgrounding the
app ends its local call audio and stops call polling:

1. iOS native PushKit receiver reporting incoming calls immediately to CallKit,
   audio-session activation/interruption handling, and native answer/end events.
2. Android Telecom/ConnectionService integration, permission-compliant foreground
   microphone service, and high-priority FCM call-event wake-up handling.
3. Authenticated server registration/revocation of platform-specific call tokens,
   bound to workspace, member, device and environment. General Expo push tokens
   are not interchangeable with APNs VoIP tokens. Respect availability/opt-out.
4. Signed APNs/FCM delivery from verified Meta call events to authorized available
   members only, with short expiry, replay protection and minimal notification
   content. Push payloads must not carry SDP, credentials or audio.
5. Multi-device answer arbitration, terminal-event dismissal, logout cleanup,
   expired invitations, token rotation and access revocation. Reauthorize against
   the server before claim; never trust notification contents as authorization.

No background entitlements, production push configuration or provider keys were
enabled as a substitute for implementing this infrastructure.

## Required Device Checklist

Use only separately authorized QA sender and participant numbers. Recording off.

1. Install rebuilt Android and iOS QA apps. Confirm normal builds remain history
   only and deny microphone without crashing or reserving an inbound call.
2. Opt into incoming availability. Receive a QA call, answer, verify two-way audio,
   mute/unmute, remote hang-up and app hang-up. Check allowance counts once.
3. Cancel and confirm team decline. Verify missed/declined calls consume no
   accepted-call allowance and another agent answering removes the stale alert.
4. Check missing/revoked/expired customer permission. Cancel a request, then send
   one explicitly; outside the message window require a real approved template.
   Grant permission on the QA phone, refresh and explicitly dial. Verify audio,
   mute/unmute, both hang-up paths and uncertain-response handling without redial.
5. Change account/permissions or sender during microphone setup. No late claim,
   SDP submission, wrong-account control, or lingering microphone capture.
6. Exercise inbox call options, sender/template dropdowns, small-screen keyboard,
   portrait/landscape, Close and Android back. Confirm call controls are reachable
   above sheets and keyboard; fix any real-device layering issue before release.
7. Switch apps, lock the phone, switch networks and interrupt with a system call.
   Until background integration is complete, verify audio is ended rather than
   promising continued ringing or a working background call.
8. After background integration, separately test locked/killed app delivery,
   Bluetooth/earpiece/speaker routing, interruptions and multi-device races.

Automated controller, native-adapter and renderer tests use mocks. They cannot
establish real audio quality, device routing, background delivery or store readiness.
