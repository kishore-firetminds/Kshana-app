# KshanaAPI Mobile CRM

A responsive Expo and React Native CRM for managing conversations, campaigns,
alerts, analytics, automations, templates, integrations, and teams.

## Requirements

- Node.js 20 or newer
- npm
- Expo Go or a configured Android/iOS development environment

## Local development

```bash
npm install
npm start
```

Then press `a` for Android or `i` for iOS. You can also start a platform
directly with `npm run android` or `npm run ios`.

The current application uses local mock data. Sign-in accepts a correctly
formatted email address and a password containing at least eight characters.
The Forgot Password experience is implemented locally and is ready to connect
to an authentication API.

Run static validation before submitting changes:

```bash
npm run typecheck
```

## Structure

- `src/navigation.tsx` — authentication, drawer, tabs, feature stacks, deep links and tablet rail
- `src/figmaScreens.tsx` — current branded CRM screens and interactions
- `src/figmaComponents.tsx` — reusable branded UI primitives
- `src/figmaTheme.ts` — current design tokens
- `src/data.ts` — typed mock API data
- `src/store.ts` — Zustand session state
- `assets/brand` — official KshanaAPI logo and app icon assets
