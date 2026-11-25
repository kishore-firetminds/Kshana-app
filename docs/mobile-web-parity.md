# Mobile / Web Parity

## Integration Scope

The local `codex/mobile-web-parity-20261125` branch starts from mobile main
`496c247`, retaining the 1.1.0 navigation/access, brand, notification-badge and
store configuration changes. The nine original local drafts are preserved in a
separate safety stash. No app-store release, web deploy or production policy
change is part of this integration.

| Feature                                                             | Mobile implementation                                                                                                                                                                                                                |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sender selection                                                    | Native picker lists only the signed-in member's connected, authorized numbers. Changing number invalidates the inbox and closes new-chat drafts.                                                                                     |
| Team number assignments                                             | Native owner/admin editor, explicit save confirmation, revision-based concurrency, read-only protection and stale-access cleanup.                                                                                                    |
| Messages                                                            | Native reply, internal notes and attachments. WhatsApp free-form replies require a valid, fresh inbound timestamp; approved templates remain available outside the window.                                                           |
| Templates                                                           | Native approved-template picker uses the dedicated send endpoint, pins requests to the conversation sender, validates parameters and preserves failed drafts. No automatic retry.                                                    |
| Contact edits, labels, segments, attributes, filters and pagination | Current responsive web tools in the authenticated workspace; explicit drawer entries for segments and attributes.                                                                                                                    |
| AI agents and assistance                                            | Native human-reviewed reply drafts and plain-text summaries, plus AI Agents and full web inbox tools. Existing permission/entitlement checks remain authoritative; agent configuration and autonomous replies are not changed.       |
| Commercial invoices                                                 | Authenticated business-invoice workspace, distinct from blocked subscription checkout.                                                                                                                                               |
| Calls                                                               | Native history and conversation links. Opt-in QA builds add foreground answer, permission-checked outbound calls, mute and hang-up across screens. Embedded browser audio stays hidden. Recording and background calling remain off. |

Native foreground calling is implemented locally behind an explicit build flag;
the normal production build still offers history only. Real-device audio has not
been verified. Background/lock-screen calling still requires native system-call
integration and signed VoIP push delivery; the current implementation ends local
audio when backgrounded. Recording settings and rollout grants are unchanged.
See `docs/native-calling.md` for the remaining release gates.
Commerce catalog/orders and newer AI intent/lead features still under review in
unmerged web/backend PRs are not treated as deployed features here.

Native AI assistance now also provides Suggest reply and Summarize conversation
inside a chat. Capabilities are loaded only for members with `ai_assist.use`;
the existing workspace toggles and backend authorization remain authoritative.
Suggestions open in an editable review sheet, not directly in the composer.
Using one copies the reviewed text only. Replacing existing text requires an
explicit confirmation, which is rejected if the draft or conversation changes.
Sending is always a separate human action. Summaries are rendered as plain text
and cannot modify the composer. AI generation, provider errors and dismissed
reviews never automatically retry or send a customer message.

Changing account, sender, conversation context or capabilities cancels pending
client requests and removes stale output. A provider may still finish processing
an already-started request; cancellation does not promise a usage refund.
AI review, template and conversation-option
sheets keep Close outside their scrollable area; Android back cannot dismiss an
in-flight template send. Revoked conversation access clears cached history and
unsent draft/attachment state rather than leaving it visible in a disabled field.

## API Contracts

- `GET /integrations/whatsapp/my-numbers`: member-visible accounts, active number
  and management capability. Never display a Meta phone-number ID as a phone.
- `POST /integrations/whatsapp/active-number`: `{ phoneNumberId }`, after an
  explicit picker selection. No update is sent merely by opening the screen.
- `GET /integrations/whatsapp/number-access`: owner/admin policy, revision,
  connected accounts and active team members.
- `POST /integrations/whatsapp/number-access`: only `enabled`, `revision` and
  assignment rows; saving enables enforcement. Preserve the revision, confirm
  consequences and reload/discard after a stale-revision rejection. Server
  validation remains authoritative.
- `GET /conversations`: inbox requests include
  `x-whatsapp-phone-number-id` for the selected sender. Wait for number selection
  before loading or creating WhatsApp chats.
- `POST /conversations`: explicitly pins the sender in both header and
  `whatsappPhoneNumberId`; does not send a customer message.
- `GET /whatsapp-templates` and `POST /whatsapp-templates/:id/send`: sender header
  is taken from `conversation.whatsappPhoneNumberId`, not a mutable personal
  preference. Send body is `{ conversationId, parameters }`. Templates must not
  use the ordinary conversation-message endpoint.
- `GET /whatsapp-calls`: access-scoped history, available senders and allowances.
  Native QA controls use the existing action and outbound permission APIs, as
  detailed in `docs/native-calling.md`. No recording endpoint is called.
- `GET /ai-assistance/capabilities`: native controls use the effective toggles,
  not owner-only settings. Failure or revoked capability hides the controls.
- `POST /ai-assistance/conversations/:id/suggest-reply` and `/summary`: explicitly
  requested generation only, pinned to the conversation sender when available.
  There is no automatic call to a message-send endpoint from either action.

`useResource` keys results by account, request path, selection and sender. It
aborts prior requests, ignores late responses and clears private data after
401/403/404 responses. Temporary connectivity failures retain same-scope data;
they never retry a message or access-policy mutation.

## Local Validation

Run `npm test`, `npm run typecheck`, and `npm run release:check`.
Android and iOS JavaScript/assets exports use Expo's local export command;
they are not signed installable apps or store submissions. Keep exports under
ignored `artifacts/`, not in a release commit.

Regression tests use synthetic fixtures and mocked requests only. They cover
sender/account changes, stale responses, access revocation, reply-window
boundaries, note availability, dedicated template routing, draft retention,
double-tap protection, read-only assignments and embedded-call restrictions.

Before any store release, use a development build on Android and iPhone to check:

1. Switch authorized numbers; only the chosen sender's inbox appears. Revoke
   access in a controlled test workspace and confirm cached content disappears.
2. Open a fresh test chat; check attachments, template parameters, keyboard,
   Close buttons and portrait/landscape layouts without clipping.
3. Edit number assignments in a disposable workspace; cancel, discard, confirm
   and stale-revision reload must behave correctly. Do not use real customers
   for this check without separate authorization.
4. Open Contacts, labels, saved segments, attributes and filter drawers. Verify
   export/download, back navigation and selected filter persistence.
5. Open AI Agents and full inbox tools with permitted and denied accounts.
   Draft generation must not send a reply without explicit human action.
   In the native inbox, generate a suggestion while typing, edit it in its review
   sheet, cancel/confirm replacement and send separately. Change chats while
   generation runs; stale output must not appear. Generate/dismiss a summary and
   confirm the typed message is unchanged. Revoke the AI permission/toggle and
   verify the controls/output disappear after refresh.
6. In the normal build, confirm history-only behavior with no microphone request.
   In a native calling QA build, follow the foreground call checklist in
   `docs/native-calling.md`. Recording must stay off in both builds.
7. Verify notifications/badges, logout, offline recovery and blocked subscription
   checkout. Signing, push delivery and store-review requirements remain separate.

No emulator or physical device was connected during automated local validation;
device behavior must not be inferred from passing renderer tests or JS exports.
