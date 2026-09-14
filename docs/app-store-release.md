# KshanaAPI App Store release sheet

This sheet contains non-secret metadata for the first iOS release. Enter review
credentials only in App Store Connect. Never commit their password or an App
Store Connect API key.

## App record

- Platform: iOS
- Name: KshanaAPI
- Primary language: English (U.S.)
- Bundle ID: `com.firetminds.kshanaapi`
- SKU: `kshanaapi-ios-1`
- User access: Full Access
- Version: 1.0.0
- Primary category: Business
- Secondary category: Productivity
- Price: Free

## Listing metadata

- Subtitle: Your workspace, on the go
- Promotional text: Manage customer conversations, campaigns, alerts, templates,
  automations, contacts, and team workflows from one secure mobile workspace.
- Keywords: crm,business,inbox,campaigns,automation,templates,contacts,analytics,team
- Marketing URL: https://kshanaapi.com/
- Support URL: https://kshanaapi.com/support
- Privacy policy URL: https://kshanaapi.com/privacy-policy
- Copyright: 2026 Firetminds

### Description

Keep your team connected to customers with KshanaAPI for mobile.

- Manage your shared inbox and customer conversations.
- Access campaigns, message templates, and automation workflows.
- Stay informed with workspace alerts and optional push notifications.
- Work with contacts, leads, businesses, and follow-ups.
- Review business reports and optional mobile usage analytics.
- Manage your profile, notification preferences, and privacy choices.

Sign in with your KshanaAPI workspace account. Features depend on your role,
workspace configuration, and subscription. Push notifications require permission.
An internet connection is required.

## App Review access

- Sign-in required: Yes
- Contact information: use the Firetminds release owner details in App Store Connect
- Demo email: enter the operator-provided reviewer email in App Store Connect
- Demo password: enter privately in App Store Connect; do not add it here
- Workspace ID: `firetminds-demo`

### Review notes

KshanaAPI is a business workspace CRM. On the sign-in screen, enter the supplied
email and password, expand **Workspace ID**, enter `firetminds-demo`, and sign in.
The demo account is an owner in a production-isolated sample workspace.

Main tabs are Home, Inbox, Campaigns, Alerts, and Profile. The navigation menu
provides Templates, Automations, Contacts, Follow-ups, Analytics, team management,
integrations, settings, and help. Profile contains notification permission,
optional analytics consent/deletion, privacy and terms links, and an account
deletion request. Purchases and subscription changes are completed on the website;
the iOS app does not contain native purchases or external checkout prompts.

Please do not send messages or launch campaigns. The workspace contains sample
content so the major workflows can be reviewed without contacting customers.

## App Privacy worksheet

Confirm these answers against production processor contracts before submission.
The current implementation does not track users and does not use an advertising ID.

- Contact Info: name, email address, phone number, and physical address — app
  functionality and account management; linked to identity.
- User Content: messages, photos/videos, uploaded files, and other user content —
  app functionality; linked to identity; only collected when a user uses the feature.
- Identifiers: user ID and device/push identifier — app functionality, account
  management, and notifications; linked to identity.
- Usage Data: product interaction — first-party analytics; optional, linked to
  identity, and erasable in the app.
- Approximate Location: production web analytics may derive coarse location from
  network information inside embedded workspace pages; analytics purpose.
- Tracking: No.

## Submission gates

- Create the App Store Connect record and verify the legal developer entity.
- Accept any pending Apple agreements and complete tax/banking items if shown.
- Configure the App ID, distribution certificate, provisioning profile, and APNs.
- Build a signed production IPA with EAS and upload it to App Store Connect.
- Inspect the archive privacy report and export-compliance result.
- Test the signed build on a physical iPhone, including notification permission,
  foreground/background/terminated push delivery, login/logout, and deep links.
- Capture final screenshots from the signed/current build for the required iPhone
  display size and iPad display size because tablet support is enabled.
- Complete age rating, content rights, App Privacy, availability, pricing, and DSA
  trader status using the legal account owner's answers.
- Add review contact details and the demo credentials privately.
- Submit first to TestFlight; submit publicly only after signed-device QA succeeds.
