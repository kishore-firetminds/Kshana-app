# KshanaAPI Mobile CRM

A responsive Expo and React Native CRM for managing conversations, campaigns,
alerts, analytics, automations, templates, integrations, and teams.

## Requirements

- Node.js 20.19.4 or newer (Node 22 recommended)
- npm
- An Expo development build or a configured Android/iOS development environment

## Local development

```bash
npm install
npm start
```

Then press `a` for Android or `i` for iOS. You can also start a platform
directly with `npm run android` or `npm run ios`.

The app now uses Expo SDK 54. Remote push requires a development/store build on a
physical device; Expo Go can only be used for basic UI checks with matching SDK.
See [mobile release runbook](docs/mobile-release.md), [store listing draft](docs/store-listing.md),
and [privacy disclosure worksheet](docs/privacy-disclosures.md) for publishing.
Run `npm run release:check` to validate local release configuration and add
`-- --credentials` to check the Android Firebase configuration file.

Profile includes optional push notifications and opt-in first-party usage
analytics. The Analytics menu contains business reports and a 30-day mobile usage
summary. New `/mobile` endpoints and the Prisma migration in sibling `kshana-be`
must be deployed before these features are available on the production server.

The active mobile screens use the production backend through
`https://kshanaapi.com/api/backend`. Sign in with a production
account. Enter the optional workspace slug if your email belongs to more than
one workspace. Forgot Password calls the backend and reports its result.

Copy `.env.example` to `.env` to override the deployment. Restart Expo after
changing environment variables. `EXPO_PUBLIC_SITE_URL` controls web links;
`EXPO_PUBLIC_API_URL` controls API requests. These values are public build
configuration and must not contain secrets.

The site uses Next.js. Its `/api/backend` proxy reads the access
token from the `dealnexus_access_token` cookie, which native requests supply
explicitly. A direct NestJS base URL ending in `/api` instead uses Bearer auth.
Sign-in and refresh go through the backend proxy, not the web-only login route
that returns browser cookies without a token body. This transport targets
Android/iOS; browser builds should use the existing web frontend.

Remember Me stores only session tokens in Expo SecureStore. Otherwise tokens
stay in memory. Expired access tokens refresh once; concurrent requests share
the refresh. Logout clears local state and attempts server revocation. A network
failure does not erase a remembered session. Saved sessions are scoped to the
configured API URL.

## Connected features

- Inbox: server search, status filters, pagination, unread counts, assignments,
  new conversations from contacts with WhatsApp numbers, and conversation history.
- Messaging: text, internal notes, photo/document upload, signed attachment links,
  delivery status, approved active templates with parameters, status changes,
  and self-assignment. Failed sends retain the draft; sends are not automatically
  retried on network errors. Check conversation history before manually retrying
  an ambiguous timeout.
- Dashboard, notifications, and profile read live API data. Alerts include
  page search, all/unread filtering, detail links, individual/all read actions,
  pagination, and foreground refresh. Profile name can be updated natively.
- Campaigns, templates, and automations use the complete responsive web editors
  inside an authenticated mobile WebView: draft/edit, audience and CSV selection,
  scheduling and launch controls, template media/buttons/approval, and automation
  creation/canvas/publishing/run history. These are embedded web workflows.
- The hamburger menu also exposes contacts, leads, businesses, follow-ups,
  template library, quick replies, reports, team, integrations/developer tools,
  billing, usage, Meta payments, settings, and support, subject to permissions.
- Embedded screens share the signed-in session. An empty WebView first clears
  old cookies; a native HTTPS request obtains HttpOnly cookies and synchronizes
  the refreshed access token. Credentials never enter URLs or injected scripts.
  Embedded workspaces require SITE_URL and API_URL to have the same HTTPS origin.
- Permissions and read-only subscription state control available actions. The
  server remains authoritative. Opted-out WhatsApp contacts cannot receive
  customer replies; internal notes follow their separate permission.
- Native back and reload controls accompany embedded workflows. External payment
  or provider links can open their corresponding external apps/browser.
  Switching away from an embedded module closes its WebView; save drafts first.
- Blob exports (invoice PDFs and import-report/CSV downloads) open the native
  save/share sheet, up to 20 MB. Temporary exports live in the private cache and
  are expired after 24 hours when exporting again.

Conversation detail refreshes every 8 seconds while focused; the inbox every
15 seconds and overview lists every 30 seconds. Requests stop on blur/background
and resume on foreground. The web origin does not proxy Socket.IO, so mobile
uses polling. Background push notifications are not configured.

Run static validation before submitting changes:

```bash
npm run typecheck
npm test
```

## Structure

- `src/navigation.tsx` — authentication, drawer, tabs, and feature stacks
- `src/figmaScreens.tsx` — branded sign-in and password recovery
- `src/liveScreens.tsx` — connected dashboard, inbox, messaging, campaigns, alerts, profile
- `src/WorkspaceScreen.tsx` - authenticated embedded workspace and navigation
- `src/moduleScreens.tsx` — supporting workspace modules
- `src/api/` — native API transport, contracts, messaging helpers, secure persistence
- `src/useResource.ts` — focus-aware requests and polling
- `src/figmaComponents.tsx` — reusable branded UI primitives
- `src/figmaTheme.ts` — current design tokens
- `src/data.ts` / `src/screens.tsx` — legacy prototypes, not used by active navigation
- `src/store.ts` — Zustand session state
- `assets/brand` — official KshanaAPI logo and app icon assets

See `docs/backend-frontend-review.md` for the reviewed contracts, upstream
findings, and validation boundaries.

## Shared visual theme

Native screens use the web app's light theme: forest-green primary controls,
orange/cream accents, warm white surfaces, and Geist typography. Static Geist
font faces are bundled for consistent weight rendering on Android and iOS.
The same tokens are used at phone and tablet widths, including native navigation
and the loading state around embedded web modules.

`src/webTheme.json` is generated from `kshana-fe/app/globals.css`. To update it:

```bash
npm run theme:sync
# Or pass a different frontend CSS path:
npm run theme:sync -- ../kshana-fe/app/globals.css
```

`src/figmaTheme.ts` maps these tokens to native component styles; `src/themedText.tsx`
provides the shared typefaces. The app uses the web's current light appearance
regardless of the device's system theme.

The bottom navigation uses a rounded dock with a translucent mint glass gradient,
a curved notch around the raised active icon, bold active labels, and generous
touch targets. Its glass appearance uses SVG gradients rather than backdrop blur.
The notch and active bubble glide together over 340 ms on the UI thread, with
crossfading icons. It respects the system reduced-motion setting, safe-area insets,
and keyboard visibility. Rapid tab changes retarget the current animation.
Its width is capped on tablets so destinations stay close together.

Embedded workspace screens display the deployed web app, so web changes appear
when those screens reopen or reload. Local frontend edits must be deployed first.
Native inbox, alerts, profile, navigation, and theme changes require a mobile
update; run `npm run theme:sync` before building to pick up web theme changes.
Changes to the web shell structure may also require updating the mobile wrapper.
The wrapper keeps a single loading message until the web shell is ready and uses
the web page title, with native back and reload icons beside the brand logo.
