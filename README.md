# QueueUp Mobile

Native QueueUp app built with Expo SDK 57, React Native, TypeScript, and Expo Router.

## Development

```bash
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` in the local, gitignored `.env` to select the QueueUp API server. The default is the production server.

Useful checks:

```bash
npx expo lint
npx tsc --noEmit
npx expo export --platform web
git diff --check
```

## Builds

EAS is configured for the `@queueupmusic/queueup-mobile` project:

```bash
eas build --platform android --profile preview-dev
eas build --platform ios --profile preview-dev
eas build --platform ios --profile preview-prod
eas build --platform all --profile production
```

`preview-dev` uses the development backend; `preview-prod` uses the production backend. iOS preview builds are internal/Ad Hoc builds for registered devices.

## Project layout

- `src/app/` — Expo Router screens and routes
- `src/components/` — shared UI
- `src/context/` — authentication and session state
- `src/lib/` — API and native services
- `src/types/` — API/domain types

The app uses QueueUp’s authenticated Django session and CSRF-based API architecture. Backend API details are documented in `API_CONTRACT.md`.
