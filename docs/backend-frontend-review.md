# Backend / web alignment review

Reviewed local backend HEAD `6347b41` and frontend HEAD `7e5d7ca` on 2026-09-07.
Both repositories were clean. Changes were made only to the mobile repository.

## Contracts carried into mobile

| Area                  | Source                                                                                                        | Mobile behavior                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Routing               | backend `src/main.ts`; frontend `app/api/backend/[...path]/route.ts`                                          | Default to the development site's `/api/backend` proxy; `/api/health` on the web origin is not a NestJS route.                                  |
| Auth                  | backend `src/auth/auth.controller.ts`, DTOs; frontend `lib/auth-tokens.ts`, `lib/http.ts`                     | Workspace-aware login, token refresh, `/auth/me`, logout, password recovery, secure remembered sessions.                                        |
| Native transport      | frontend proxy reads `dealnexus_access_token`                                                                 | Explicit native cookie header for the proxy; Bearer header for a direct NestJS URL. No browser-cookie-dependent login flow.                     |
| Inbox                 | backend conversation controller/DTOs/service; frontend `app/app/inbox/page.tsx`, `components/chat-window.tsx` | Paginated `{items,meta}` responses; real route IDs; `OPEN/PENDING/RESOLVED/CLOSED`; status and unread data from the server.                     |
| Send / notes          | backend `CreateMessageDto`, `/messages`, `/internal-note`                                                     | Lowercase `senderType: user`; separate note endpoint and `INTERNAL_NOTE` direction; submit only after uploads succeed.                          |
| Contacts / assignment | backend conversation service, `AssignOwnerDto`                                                                | Use `whatsappNumber` for WhatsApp availability, `ownerId` for self-assignment, and separate opt-out handling for customer replies.              |
| Templates             | backend template service; frontend inbox template filtering                                                   | Meta-approved templates are represented by `ACTIVE`, not `APPROVED`. Send through `/:id/send` with conversation ID and ordered body parameters. |
| Private media         | backend `9ad4944`, response interceptor and storage services                                                  | Keep signed query strings when rendering/opening; submit original upload storage references. Do not persist signed display URLs.                |
| Permissions / billing | backend permissions guard; frontend access control                                                            | Use returned permissions and `entitlements.canMutate`; do not invent role-based permissions or successful actions.                              |
| Automation handoff    | backend `6347b41`                                                                                             | Embed the full responsive flow editor in the mobile app, preserving the web validator and backend support for terminal human-handoff nodes.     |

## Upstream issue found

**High priority: user authentication hashes are included in API response objects.**
`kshana-be/src/auth/auth.service.ts` (`me`, around line 624) fetches the full
Prisma User and spreads it into the response. The User model includes
`passwordHash` and `refreshTokenHash`. The global response interceptor resolves
storage URLs but does not strip these fields; PrismaService has no global omit
configuration. Conversation queries also include complete `assignedTo` and
`senderUser` records. Those relationships can expose another team member's
hashes to a user with inbox access.

Fix upstream using explicit public-user selections/DTOs (including nested
relations), and add response tests asserting these fields never appear. The
mobile UI never displays these fields and only session tokens are persisted,
but a mobile-only UI change cannot fix server-side response disclosure.

This finding is based on source inspection, not a dump of authenticated live
account responses. Backend and frontend source files were not modified.

## Validation

- TypeScript checks and focused API/messaging contract tests.
- Development website and backend proxy reached over HTTPS; anonymous `/auth/me`
  returned 401, and an empty login payload returned backend validation errors.
- Android bundle and sign-in screen checked in Expo Go.
- Verified fresh development-account sign-in, dashboard, inbox, and conversation
  history on Android. The tab bar's experimental `dimezisBlurView` method caused
  a blank screen even though authenticated content was present in the native
  accessibility hierarchy. Disabling that method on Android restored rendering;
  a fresh sign-out/sign-in also rendered successfully. iOS retains native blur.
- Actual WhatsApp delivery was not exercised. No customer messages,
  password-reset emails, campaign launches, or billing changes were triggered
  during implementation.

The active screens have no mock-data fallback. Legacy prototype source remains
unreferenced by active navigation. Supporting configuration workflows now run in authenticated in-app WebViews.
The existing web editors provide their full role/plan-gated actions.

## Embedded module completion

Reviewed frontend campaign list/editor, template editor, automation form/canvas,
app shell navigation, and auth socket-token/refresh routes. Native session
preparation explicitly enables cookie storage (withCredentials) after mounting
an empty incognito WebView. The server sets HttpOnly cookies; the response token
is synchronized back into native memory/SecureStore. Logout also handles a
server session refreshed by the embedded workspace. The bootstrap request is
restricted to the configured API's HTTPS origin.

Android source Cookie headers did not reliably authenticate the first WebView
request. Native preparation followed by loading the workspace succeeded. No
credentials are injected into JavaScript or URLs. The native hamburger replaces
the duplicated web shell header; feature-specific controls remain intact.

Live Android verification: campaign list and create form; live template list
and template creation form. Further verification results are recorded below.

Final Android verification (2026-09-07):

- Restored the remembered development-account session after a cold emulator restart.
- Opened campaign creation and template creation with live account data.
- Created an unpublished Mobile_Verification_Draft automation, opened its canvas
  with messages/logic/CRM/handoff controls, and deleted that exact temporary draft.
  The list returned to zero flows; nothing was published or run.
- Loaded live native alerts and verified the unread/all filter.
- Exercised a local blob download through the injected export bridge into the
  Android native share sheet, then canceled without sharing externally. Android
  WebView message events supply the sender origin without its path; validation
  checks that origin against the configured site.
- TypeScript and 18 focused tests passed, including detached download anchors
  with immediate blob revocation and session/logout races.
- iOS, actual WhatsApp delivery, campaign launch, Meta approval, provider OAuth,
  and payment transactions were not exercised. Those embedded actions retain
  the web application's permissions, validation, and provider requirements.

Theme alignment: native light-theme tokens are now generated from the frontend's
CSS, with bundled Geist font weights, green primary controls, cream/orange drawer
selection, warm backgrounds, and matching borders/surfaces. Removed the native
purple glass tab treatment. Verified native dashboard rendering at phone size
(1080x2400, density 420) and tablet size (1600x2560, density 240), including the
permanent drawer. Long workspace names truncate within the drawer card. iOS
uses the same tokens/fonts but was not run in this Windows environment.
