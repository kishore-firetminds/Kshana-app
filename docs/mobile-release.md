# Mobile release runbook

## Prepared

- Expo SDK 54 / React Native 0.81, Android API 36, Xcode 26 EAS image.
- Bundle/package `com.firetminds.kshanaapi`; production origin https://kshanaapi.com.
- EAS development, internal preview APK, production AAB/iOS profiles.
- Push permission UI, token registration/rotation, foreground handling and
  notification taps to Alerts, including cold-start/session checks.
- Opt-in first-party mobile analytics and workspace-scoped summary reports.
- Privacy, terms, and account-deletion request controls in Profile.

## Backend deployment (required before enabling these features)

Changes are in sibling `kshana-be` and `kshana-fe`; they are not deployed by an
app build. Deploy migration `20260907000000_mobile_push_analytics` with
`npm run prisma:deploy`, generate the Prisma client, then deploy the backend.
Do not run development migrations against production.

Endpoints under `/api/backend/mobile`:

- `PUT devices`: authenticated installation UUID, Expo token, and platform.
- `DELETE devices`: remove the signed-in user's installation.
- `POST analytics`: validated batches of up to 20 allowlisted events.
- `DELETE analytics`: erase the signed-in user's mobile events.
- `GET analytics`: last-30-day workspace aggregates; requires `reports.read`.

Set backend `MOBILE_PUSH_ENABLED=true` after provisioning credentials. Enable
Redis queues AND workers. The mobile-push queue retries delivery requests and
checks Expo receipts after 15 minutes. DeviceNotRegistered removes the token.
Revoked login sessions are excluded before delivery. In-app alerts continue even
if queuing fails; monitor failed jobs and enqueue error logs. Delivery retries
can produce duplicates if a transport response is lost; do not assume exactly-once
delivery. Daily cleanup expires registrations and deletes analytics older than
90 days, whether or not push sending is enabled.

Configure `EXPO_ACCESS_TOKEN` on the backend if Expo enhanced push security is
enabled. This token is secret and must never be an EXPO_PUBLIC variable. Configure
FCM v1 service credentials in EAS and APNs credentials for the Apple app identifier.

## Firebase configuration status (2026-09-08)

- Created Firebase project `kshanaapi` (KshanaAPI), Spark plan.
- Registered Android app `com.firetminds.kshanaapi`.
- Downloaded and validated `google-services.json`; ignored by Git. App config
  uses this local file when present, with `GOOGLE_SERVICES_JSON` taking precedence.
- Uploaded `GOOGLE_SERVICES_JSON` as a secret file variable for the EAS project
  in development, preview, and production; verified all three environments.
- Android prebuild applies the Google Services Gradle plugin;
  `app:processDebugGoogleServices` passed.
- Firebase console confirms Cloud Messaging API (V1) is enabled.
- Created dedicated service account `kshanaapi-expo-push@kshanaapi.iam.gserviceaccount.com`
  with Firebase Cloud Messaging API Admin (`roles/firebasecloudmessaging.admin`).
- Generated its JSON key and uploaded through EAS credentials. EAS confirmed the
  key is assigned to `com.firetminds.kshanaapi` for FCM V1. The private key remains
  outside the repository; never put it in the mobile bundle or public env variables.
- Backend push environment setup confirmed complete by the operator on 2026-09-08.
  Public readiness reports database/Redis up, queues/workers configured, and
  background processing enabled. The push flag itself is not exposed by readiness.
- EAS Android signing keystore created; preview APK build completed successfully:
  https://expo.dev/accounts/kishore15421/projects/kshana-api/builds/017f8db5-b72c-4484-b856-7195363d2df1
- Signed APK: `artifacts/KshanaAPI-1.0.0-preview.apk` (version 1.0.0, code 1).
  APK signature verification passed; package `com.firetminds.kshanaapi`, target
  API 36, arm64-v8a/armeabi-v7a/x86/x86_64.
- Preview APK installed successfully on the emulator and reached the login
  screen without Metro. No AndroidRuntime/ReactNativeJS error was captured.
  Emulator System UI was unstable during boot/installation and recovered after
  restarting the app; this is a launch check, not authenticated/device push QA.
  Screenshot: `artifacts/kshana-preview.png`.
- APNs and live device tests remain pending.

## Play Console preparation (2026-09-08)

### Replacement release with responsive layout fixes

Do not upload `KshanaAPI-1.0.0-3.aab`: it predates the keyboard fixes.
Native vertical forms now share a keyboard-avoiding scroll region; the chat
composer has its own region. Login supports Next between fields, wrapping
options, expandable input heights and landscape safe areas. Embedded workspace
pages constrain their shell/dialog height to the visible keyboard viewport.
These changes are mobile-only. Replacement production build 1.0.0 (4):
https://expo.dev/accounts/kishore15421/projects/kshana-api/builds/bea49cea-b01f-4231-b533-656dd59bad55
Build finished successfully; local `artifacts/KshanaAPI-1.0.0-4.aab` is
76,645,512 bytes. JAR signature verified, and all 44 checked 64-bit native
libraries meet 16 KB ELF alignment. SHA-256:
`076fdbc07d11462d49669abfe1646ef0641d8fc107e88c998e7c1a95ee7b524e`.

Published version 4 to Google Play internal testing on 2026-09-08 at 02:41 IST.
Console confirms Active / Available to internal testers / Not reviewed.
The assigned KshanaAPI Internal Testers list has one operator-selected tester.
Join URL: https://play.google.com/apps/internaltest/4701654932009888746
Play reports API 24+, target SDK 36, four ABIs and a 29.5 MB new-install download.
The only validation warning is the missing deobfuscation file; release minification
is disabled. Native debug symbols are attached. The temporary store name is
`com.firetminds.kshanaapi (unreviewed)` until the store setup/review is complete.
This is an internal release, not public production publication.

TypeScript and 27 tests pass, including embedded viewport resize/reveal coverage.
Android production JavaScript export succeeded in `artifacts/responsive-export`.
The Android emulator became usable after choosing Wait on its system-app ANR.
The development client verified password focus above the keyboard and scrolling
to Sign in with the keyboard still open at 320 dp width and 130% system text.
The short landscape form also scrolls; Android uses its standard full-screen
input editor there. Evidence: `artifacts/layout-keyboard.png`,
`artifacts/layout-small-submit.png`, and `artifacts/layout-landscape-scroll.png`.
Tablet layout at 1067 dp width also renders the centered, width-limited form
(`artifacts/layout-tablet.png`). Emulator size, density and text scale restored.
The final Android scrolling change retains the keyboard on drag. TypeScript and
27 tests pass again; iOS JavaScript export also succeeds. This is not iOS device
validation or a physical-device remote-push test.
Before a public release, verify
reset form, profile, template parameters, chat composer, and embedded campaign,
automation and settings dialogs. Cover keyboard open/closed, short landscape,
small phone, tablet, and enlarged system text on Android and iOS. Do not submit
real customer messages or reset emails as part of layout checks.

- Existing Firetminds organization app: `4974513343229694022`, package
  `com.firetminds.kshanaapi`; no previous bundles or releases.
- Play App Signing is enabled; upload certificate will be registered on first bundle.
- Saved an internal-release draft and store description draft. Saved support
  contact `support@kshanaapi.com` and website `https://kshanaapi.com`.
- Purchases remain on the website per operator instruction. Mobile billing,
  usage-billing and Meta payment entries removed; embedded purchase links,
  banners, SPA checkout routes, and payment-provider popups blocked. Website
  source unchanged. TypeScript and 26 tests pass.
- The earlier version-code-2 production build was canceled before upload so it
  cannot ship the prior mobile billing navigation. Replacement version-code-3 build:
  https://expo.dev/accounts/kishore15421/projects/kshana-api/builds/90725501-1460-45fe-9a38-a5c959fef461
- Created and assigned KshanaAPI Internal Testers with the operator-provided tester.
- Production version 1.0.0 (3) finished successfully. Local bundle:
  `artifacts/KshanaAPI-1.0.0-3.aab` (76,643,882 bytes). JAR signature verified;
  all 44 arm64-v8a/x86_64 native libraries have at least 16 KB ELF segment alignment.
  Play validation and device testing remain pending.
- The earlier Chrome upload restriction was resolved after the operator enabled
  extension file access. Version 4 was uploaded and published successfully.
- Reviewer access, store artwork/screenshots and app-content
  declarations remain incomplete for public release. Internal version 4 is active.
- The operator supplied a reviewer email; the initial production authentication
  check without a workspace slug returned Invalid credentials. Do not mark
  reviewer access complete until the account and workspace are verified.
  A second check with the initial operator-supplied workspace also returned 401.

### Reviewer credentials updated (2026-09-08)

The replacement operator-provided account in workspace `firetminds-demo`
authenticates successfully against production. `/auth/me` confirms OWNER access,
all main module capabilities and `canMutate: true`. Credentials and workspace
instructions are saved in Play Console under Firetminds demo reviewer; no password
is stored in this repository. Optional Google/partner experience-testing access
is off. Dashboard now shows Sign-in details complete and 7 of 11 tasks complete.

Send app for review is disabled: Content rating, Target audience, Data safety and
Store Listing remain incomplete. Production is inactive; internal version 4 stays
active. A subsequent production check confirms Business plan, INTERNAL billing,
full module access and subscription end January 1, 2027 (00:00 UTC).
Target audience is saved as 18 and over. Data safety is saved and Publishing
overview confirms the production privacy URL. After saving the store listing,
Dashboard confirms 10 of 11 setup tasks complete; Content rating remains.
The existing icon was fitted to 512x512 using Play's asset editor; the generated
feature graphic was fitted to 1024x500. The listing is saved with four actual
1080x1920 screenshots (Campaigns, Automations, template library and template
options). The feature graphic alone is labelled as AI-generated. Screenshots
were captured from the current-code development client against production;
the separate preview APK remained queued. Login and embedded modules loaded.
No messages or campaigns were sent, and no contact-detail screenshots uploaded.
The operator approved the IARC Terms of Use and selected all available countries.
Content rating is saved: IARC 12+, ESRB Teen, PEGI parental guidance, USK 16+;
the intended audience remains 18 and over. User interaction is disclosed.
Advertising ID declaration is saved as No (no advertising SDK/ID use).

### Production submitted (2026-09-08)

Release `1.0.0 (4) - Production` uses the existing internal-test version 4 bundle.
All 176 available countries/regions plus Rest of world are selected. Validation
has no blocking bundle errors; the non-blocking missing deobfuscation-file warning
remains (release minification is disabled; native debug symbols are attached).

All 11 publication changes were sent to Google. Publishing overview confirms
**Changes in review**. A refreshed check on September 8, 2026 confirms the
automated quick-check countdown has finished and Google now states: "Your changes
are now in review." No actionable submission issues are shown.
This is a submitted release, not yet a public/approved app. Managed publishing is
off, so approved changes are configured for automatic publication. Internal
testing remains available. Check Publishing overview for any subsequent issues.
Current-code preview APK build `2a2b3b79-6ae9-424d-af68-7c84e42250a1` finished;
downloaded to `artifacts/KshanaAPI-1.0.0-4-preview.apk`. It does not replace
the version 4 AAB submitted to Google Play.

## Signing and builds

Linked project: `@kishore15421/kshana-api`
(`f4ba8cbd-001c-4fc7-a452-91f176931d53`).

1. Verify the linked Expo project/account and the immutable package identifier.
2. Firebase Android registration and EAS config upload are complete (see above).
   FCM V1 service-account credentials are uploaded and assigned to the final package.
3. Configure the Apple Developer team, app identifier with push capability,
   distribution certificate/provisioning profile, and APNs key in EAS.
4. Run `node scripts/release-check.cjs --credentials`, `npm run typecheck`, `npm test`, and `npx expo-doctor`.
5. Run `npx eas-cli build --profile development --platform android` and install on
   a physical Android device. Build an iOS development client for an enrolled
   iPhone, or use TestFlight. Expo Go cannot verify remote push.
6. Test permission deny/allow, foreground/background/terminated notifications,
   tap routing, login/logout/account switching, token rotation, and remote session
   revocation. Confirm analytics stays off until consent, counts in the report,
   and deletion removes recorded events. Use a dedicated test workspace.
7. Build `npx eas-cli build --profile production --platform all`. These commands
   need account credentials and may incur EAS build usage charges.
8. Upload to TestFlight and Play internal testing with `npx eas-cli submit
   --profile production --platform ios` / `--platform android`. The Play profile
   targets an internal draft. A first Play upload may need to be done in Console.
   Submission is not the same as publishing to the public stores.

## Store submission gates

Validation performed locally: mobile TypeScript and 24 tests passed; backend build,
Prisma schema validation, schema-to-migration comparison, and 7 mobile service tests
passed; web typecheck passed; Android/iOS JS exports succeeded; Expo Doctor passed
18/18 checks. The credential-aware release check passes with the configured
Firebase file; Android Google Services resource processing also passes. iOS native generation/archiving cannot run on this Windows host.
An x86_64 Android development APK was built locally and installed on the emulator.
It was launched through Metro and verified to reach the login screen without a
React Native runtime error. Authenticated production workflows and physical-device
remote push were not exercised in this release-preparation pass.
This APK uses a debug key and is not a Play Store or physical-phone release artifact.
That previously installed APK used the earlier identifier. The configuration and
generated Android sources now use `com.firetminds.kshanaapi`; rebuild to install
the app under the final identifier.

Dependency audit: PostCSS was pinned to patched 8.5.28. The SDK 54 toolchain still
reports transitive advisories (including image-size); review the saved local audit
in `artifacts/dependency-audit.json` and upstream fixes before release. A successful
Expo Doctor check is not a security audit. Do not blindly apply a major SDK upgrade
through `npm audit fix --force`.

- Both signed builds must pass physical-device testing. Inspect the merged Android
  manifest, target API, 16 KB native-library page alignment, and Apple archive
  privacy report. A JS export alone is not evidence of a signed build passing.
- Purchases remain on the website per operator instruction. Mobile purchase routes
  are blocked and billing navigation removed. Test embedded pages for purchase
  prompts after every relevant web change. No native in-app purchases are added.
- Ensure account-deletion requests are actually processed and disclose the real
  timeframe; source currently initiates the existing pending-review workflow.
- Publish updated privacy/data-deletion pages. Complete Data safety/App Privacy
  forms using `privacy-disclosures.md`; do not declare no data collection.
- Add dedicated reviewer credentials and demo content, support details, copyright,
  countries, age rating, export-compliance answers, and final screenshots.
- Confirm any Play developer-verification or closed-testing requirements shown
  for your particular developer account.

## References checked September 7, 2026

- https://expo.dev/changelog/sdk-54
- https://expo.dev/blog/app-store-connect-minimum-sdk-26
- https://docs.expo.dev/push-notifications/push-notifications-setup/
- https://docs.expo.dev/push-notifications/sending-notifications/
- https://developer.android.com/google/play/requirements/target-sdk
- https://developer.apple.com/news/upcoming-requirements/
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/support/offering-account-deletion-in-your-app/
- https://support.google.com/googleplay/android-developer/answer/13327111
