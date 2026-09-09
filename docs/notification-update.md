# Notification follow-up

Implemented September 8, 2026; not yet deployed or included in the Play version 4 bundle.

- First launch requests notification permission once per installation. A granted permission registers the device after login. Denials and explicit Profile opt-outs are respected; logout removes the device registration without disabling the next login.
- Notification taps resolve the alert through an authenticated, user/workspace-scoped endpoint. Inbox links open the native conversation. Other or unavailable alerts fall back to Alerts.
- Alerts opens with the unread filter and applies that filter before server pagination. Show all alerts preserves read history.
- Opening a conversation from web or mobile marks the reader's existing message alerts read. Newer alerts and other users' alerts are not cleared. Queued push delivery skips already-read alerts.

Deploy the backend first (notification lookup/filter/read-state changes; no schema migration or environment change), then build and release a new Android internal-testing version. The existing production review submission still contains version 4.

Validate on a physical phone: fresh-install permission grant and denial; login and automatic device registration; receive an assigned-conversation message while backgrounded; tap to open the conversation; verify its alert disappears from Unread after opening on either device. Already delivered OS notifications cannot be recalled by the backend read-state update.

Validation: 31 mobile tests, 20 targeted backend tests, TypeScript checks, and local release configuration checks. Physical-device notification delivery for this update remains to be verified.
