# Mac Review Handoff

Branch: `codex/mobile-web-parity-20261125`

This branch contains the mobile/web parity updates, sender-scoped inbox and
template fixes, number-access editor, native AI draft/summary review, and opt-in
foreground native calling. It is for review and device testing, not a claim that
all store-release gates have passed.

## Open and Validate

From an existing clone with your own changes saved safely:

```sh
git fetch origin
git switch --track origin/codex/mobile-web-parity-20261125
npm ci
npm test
npm run typecheck
npm run release:check
```

If the local branch already exists, switch to it and use a fast-forward-only
update instead. Do not reset or discard unrelated local work.

## What Is Enabled

Normal production builds keep native calling disabled: call history is available,
but native answering/dialing/microphone controls are not. This is intentional.
Do not remove the production flag merely to expose unfinished calling in stores.
Recording remains off and there are no native recording endpoints or controls.

For foreground calling QA, use a rebuilt development client, not Expo Go.
Set `EXPO_PUBLIC_NATIVE_CALLING_ENABLED=true` and the API/site URLs for the
isolated QA environment at native build and bundling time. Use the already
authorized QA workspace and sender; opening the screen must not grant calling
access or contact customers. See `docs/native-calling.md` for the device checklist.

## Before Public Store Submission

1. Run both actual Android and iPhone builds. JavaScript exports and mock tests
   do not verify native compilation, audio routing or device behavior.
2. Test inbox keyboard/layout, permission changes, sender isolation, templates,
   native AI review, contact/segment/filter screens and logout on both devices.
3. Keep calling gated until the separate background/lock-screen integration and
   real-device calling tests are complete. Current foreground QA calls end when
   the app is backgrounded. Do not advertise background ringing.
4. Verify signing, existing app identifiers, incremented build versions, Firebase
   configuration, Apple/Google push credentials, store privacy disclosures and a
   working review account. Never commit credentials or real customer records.
5. Distribute validated builds for testing first. The existing Android submission
   profile uses a draft production release; uploading does not mean public release.
   An iOS upload to TestFlight is separate from submitting a version for App Review.

Use the existing production build/submit profiles only after these checks pass.
This handoff does not change store settings, rollout grants or production backends.

## Repository Hygiene

Environment files, signing material, local QA credentials, generated exports,
native build folders, dependencies and test artifacts are excluded. The original
pre-parity safety stash remains in the Windows clone; it is not part of the branch.
