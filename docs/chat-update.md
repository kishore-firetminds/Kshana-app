# Mobile chat interactions

- Opening a conversation follows the latest message after native content layout. Scrolling up stops following new messages; older-history loading preserves the reading position.
- Push taps and Alerts preserve the `message` parameter from authenticated relative inbox links. The chat loads older pages until it finds the target, highlights it, and offers Latest messages. Missing targets and request failures have an explicit fallback/retry.
- Reply selects a quoted message, supports cancellation, and sends `replyToMessageId` through the existing messages endpoint. Internal notes never carry customer reply context. Quoted messages can be tapped to find the original.
- Emoji browsing, keyword search, and skin tones use the web app's emoji-picker-react Unicode catalog, rendered in a virtualized native grid. `src/emojiData.json` is derived from the sibling frontend's installed `emoji-picker-react/dist/data/emojis.json`; retain `assets/licenses/emoji-picker-react.txt` when updating it.
- Reactions use the existing reaction endpoint and follow its restriction to incoming WhatsApp messages with an external message ID. Successful reactions display on their target; failed or orphan reaction events remain visible. Permissions and opt-out restrictions apply.

Validation: component regression tests cover initial scroll events, older alert targets, replies and reaction requests. Additional checks cover safe routing, internal-note isolation, reaction grouping and emoji Unicode preservation. Android export, TypeScript and the test suite passed. Emulator checks verified opening at the latest message, existing reaction badges, emoji browsing and keyboard-visible search. No outbound customer messages or reactions were sent for testing.

These are mobile source changes. Existing server endpoints are reused; no new backend or web deployment is required for this change. Play/internal-testing users need an updated mobile build. Older alerts without a message parameter open the latest conversation messages.
