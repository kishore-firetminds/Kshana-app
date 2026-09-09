# Store privacy and Data safety worksheet

Google Play Data safety declaration saved on September 8, 2026, pending app review.
Reassess whenever backend, embedded web features or providers change.

| Data | Purpose | Handling |
| --- | --- | --- |
| Account name, email, user/workspace IDs | Authentication and workspace access | Linked to account; encrypted transport; remembered tokens in SecureStore |
| Customer messages, attachments, CRM records | App functionality | Submitted to your backend when users use these features; do not declare that the app collects no user content |
| Push token, installation ID, platform, login-session ID | Optional workspace alerts | Your backend and Expo/APNs/FCM delivery; generic previews; registration expires after 30 days without renewal |
| Screen names, notification opens, UUID event IDs, app version, platform, timestamps, user/workspace IDs | Optional app analytics | First-party backend; linked to account; opt-in; user can disable or erase; 90-day retention plus daily cleanup interval |
| Website analytics and cookies | Embedded web features | Website consent controls remain separate; assess the deployed Google Analytics configuration and privacy disclosures |
| Server authentication/access/audit logs | Security and operation | Review infrastructure's actual IP address and log retention practices |

Native analytics does not collect message text, contact names, email addresses,
advertising IDs, precise location, or arbitrary URLs. No advertising SDK or ATT
request has been added. Determine the stores' collection/sharing classifications
for your processor agreements rather than assuming all processors are exempt.

Photos/files are selected by the user. Broad Android media-library and microphone
permissions are blocked. Verify the merged release manifest before submission.
Native packages provide their own Apple privacy manifests; inspect the archived
build's privacy report and required-reason API declarations on macOS/EAS.

The mobile app can submit the existing backend account-deletion request, and
https://kshanaapi.com/data-deletion provides an outside-app request route. The
existing workflow stores a PENDING request; an operational review/deletion
process is still required. Do not describe a request as completed erasure.

Production privacy and deletion pages are deployed. Play's privacy-policy URL was
updated to https://kshanaapi.com/privacy-policy on September 8, 2026.

## Saved Google Play declaration

- Collected: name, email, user IDs, address, phone, approximate location,
  other in-app messages, photos, videos, uploaded audio, contacts, files/docs,
  app interactions, in-app searches, other user-generated content, device IDs.
- Account name/email/IDs and operational app interactions are required;
  content uploads, contact details, notifications and analytics are optional.
- Collection purposes are app functionality, account management, security and
  analytics as applicable. No advertising purpose or advertising SDK declared.
- Approximate location accounts for consent-based embedded Google Analytics;
  the production site exposes measurement ID G-M1BYR6MNV3. Native analytics does
  not read GPS. Google Analytics derives approximate geography at collection.
- No sharing declared under Play's service-provider and user-initiated transfer
  exemptions, consistent with the published processor/integration description.
  Reassess this if providers process data independently or integrations change.
- HTTPS transport, username/password accounts (including team invitations),
  account deletion requests and separate data deletion requests declared.
  Both deletion links use https://kshanaapi.com/data-deletion.
- No independent security certification or UPI badge claimed.
