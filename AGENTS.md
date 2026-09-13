# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

If `CODEX_REMOTE_HOST.md` exists, read and follow it for local Codex Remote Control, EAS, ADB, emulator, and host-PTY instructions.

QueueUp Mobile Build & Release Reference
========================================

This file is intended to live in the queueup-mobile repo so Codex (or a human)
can build, install, test, and submit the correct variant without guessing.

CURRENT IDENTIFIERS
-------------------
Expo project: @queueupmusic/queueup-mobile
Android package: com.queueupmusic.queueup
iOS bundle ID: com.queueupmusic.queueup
App Store Connect app ID: 6811379575

CURRENT EAS PROFILES
--------------------
development
  Development-client build.
  EAS environment: development.

preview-dev
  Standalone/internal build.
  EAS environment: development.
  Backend: development.
  Android: APK.
  iOS: Ad Hoc/internal IPA for registered devices.

preview-prod
  Standalone/internal build.
  EAS environment: preview.
  Backend: production.
  Android: APK.
  iOS: Ad Hoc/internal IPA for registered devices.

production
  Store build.
  EAS environment: production.
  Backend: production.
  Android: AAB for Google Play.
  iOS: App Store/TestFlight IPA.
  autoIncrement: true.


QUICK BUILD MATRIX
==================

DEVELOPMENT CLIENT
------------------
Android:
  eas build --platform android --profile development

iOS:
  eas build --platform ios --profile development


PREVIEW-DEV (DEV BACKEND)
-------------------------
Android APK:
  eas build --platform android --profile preview-dev

iOS internal/Ad Hoc:
  eas build --platform ios --profile preview-dev


PREVIEW-PROD (PRODUCTION BACKEND)
---------------------------------
Android APK:
  eas build --platform android --profile preview-prod

iOS internal/Ad Hoc:
  eas build --platform ios --profile preview-prod


PRODUCTION (STORE)
------------------
Android Google Play AAB:
  eas build --platform android --profile production

iOS App Store/TestFlight:
  eas build --platform ios --profile production

iOS build + automatic TestFlight submission:
  eas build --platform ios --profile production --auto-submit


BUILD BOTH PLATFORMS
====================
Development:
  eas build --platform all --profile development

Preview-dev:
  eas build --platform all --profile preview-dev

Preview-prod:
  eas build --platform all --profile preview-prod

Production:
  eas build --platform all --profile production


LOCAL EXPO DEVELOPMENT
======================
Start Metro:
  npx expo start

Start Metro and clear cache:
  npx expo start -c

Start web:
  npx expo start --web

While Metro is running:
  a = Android
  i = iOS (supported Mac only)


LOCAL ANDROID NATIVE BUILDS
===========================
Expo native debug build:
  npx expo run:android

Direct Gradle debug build:
  cd android
  ./gradlew :app:assembleDebug

Typical output:
  android/app/build/outputs/apk/debug/app-debug.apk

Install debug APK:
  adb install -r android/app/build/outputs/apk/debug/app-debug.apk

Direct Gradle release build:
  cd android
  ./gradlew :app:assembleRelease

NOTE:
Local debug builds use a different signing key from EAS builds. If Android says:

  INSTALL_FAILED_UPDATE_INCOMPATIBLE

run:
  adb uninstall com.queueupmusic.queueup

Then install/run the desired build again.


INSTALL / RUN COMPLETED EAS BUILDS
==================================
Android:
  eas build:run --platform android

iOS internal build:
  eas build:run --platform ios

If Android signature mismatch occurs:
  adb uninstall com.queueupmusic.queueup
  eas build:run --platform android


ANDROID / ADB HELPERS
=====================
List devices:
  adb devices

Check QueueUp package:
  adb shell pm path com.queueupmusic.queueup

Force stop:
  adb shell am force-stop com.queueupmusic.queueup

Launch:
  adb shell monkey -p com.queueupmusic.queueup 1

Clear app data:
  adb shell pm clear com.queueupmusic.queueup

Uninstall:
  adb uninstall com.queueupmusic.queueup

Clear logcat:
  adb logcat -c

General logs:
  adb logcat | grep -i -E "ReactNativeJS|AndroidRuntime|FATAL|queueup"

Push/Firebase logs:
  adb logcat | grep -i -E "FirebaseMessaging|FirebaseInstallations|ExpoPush|notification|FIS_AUTH|ReactNativeJS"


EAS ENVIRONMENT VARIABLES
=========================
Expected mapping:

development
  EXPO_PUBLIC_API_URL = DEV backend

preview
  EXPO_PUBLIC_API_URL = PROD backend

production
  EXPO_PUBLIC_API_URL = PROD backend

List:
  eas env:list --environment development
  eas env:list --environment preview
  eas env:list --environment production

Set DEV URL:
  eas env:set --environment development --name EXPO_PUBLIC_API_URL --value "https://DEV-URL-HERE" --visibility plaintext

Set preview PROD URL:
  eas env:set --environment preview --name EXPO_PUBLIC_API_URL --value "https://PROD-URL-HERE" --visibility plaintext

Set production PROD URL:
  eas env:set --environment production --name EXPO_PUBLIC_API_URL --value "https://PROD-URL-HERE" --visibility plaintext

IMPORTANT:
- .env remains local and gitignored.
- Do NOT commit .env just to switch servers.
- EAS cloud builds use the environment named by the selected profile.
- EXPO_PUBLIC_* values are bundled into the client and are NOT secrets.


ANDROID FIREBASE / FCM
======================
Client config:
  ./google-services.json

app.json should reference:
  "googleServicesFile": "./google-services.json"

Firebase Admin SDK / service-account JSON:
  SECRET.
  Never commit it.
  Do not keep it in the repo.
  Upload it through EAS credentials.

Manage Android credentials:
  eas credentials --platform android


GOOGLE PLAY
===========
Build store AAB:
  eas build --platform android --profile production

Upload the resulting .aab to Google Play Console.

Direct tester APK:
  eas build --platform android --profile preview-prod

Current new-Personal-account closed-testing requirement:
  12 testers continuously opted in for 14 days before applying for production access.


IOS CREDENTIALS
===============
Manage:
  eas credentials --platform ios

Configure preview-dev:
  Choose preview-dev
  -> Build Credentials
  -> Set up all required credentials

Configure preview-prod:
  Choose preview-prod
  -> Build Credentials
  -> Set up all required credentials

Configure production:
  Choose production
  -> Build Credentials
  -> Set up all required credentials

Push Notifications:
  eas credentials --platform ios
  -> choose profile
  -> Push Notifications

SAFETY:
- Always verify bundle ID is:
    com.queueupmusic.queueup
- Do not touch unrelated Apple app identifiers or provisioning profiles.
- Team-wide Apple Distribution Certificates may be reused.
- Do not revoke existing certificates or APNs keys without explicit approval.


IOS BUILD / TESTFLIGHT
======================
DEV-backend direct iPhone build:
  eas build --platform ios --profile preview-dev

PROD-backend direct iPhone build:
  eas build --platform ios --profile preview-prod

TestFlight/App Store build:
  eas build --platform ios --profile production

Submit an already-built production build:
  eas submit --platform ios --profile production

Build and auto-submit:
  eas build --platform ios --profile production --auto-submit

Expected eas.json submission config:
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "6811379575"
      }
    }
  }

If current Apple permissions cannot create an App Store Connect API key:
- do not use another person's Apple ID/password
- have the org Account Holder/Admin create/authorize the key


NATIVE PUSH TESTING
===================
Backend repo:
  ~/Desktop/queueup-dev

Send direct native test:
  cd ~/Desktop/queueup-dev
  docker compose exec web python manage.py send_native_test_notification USERNAME

Send to all devices for that user:
  docker compose exec web python manage.py send_native_test_notification USERNAME --all-devices

Run normal notification scheduler:
  docker compose exec web python manage.py send_round_notifications

Expected:
- no historical notification flood
- no duplicate native notifications
- legacy Web Push remains separate


CHECK REGISTERED NATIVE DEVICES
===============================
  cd ~/Desktop/queueup-dev
  docker compose exec web python manage.py shell

Then:
  from league.models import NativePushDevice
  list(NativePushDevice.objects.values(
      "user__username",
      "installation_id",
      "platform",
      "enabled",
      "last_seen_at",
      "expo_push_token",
  ))


VALIDATION BEFORE IMPORTANT BUILDS
==================================
Run:
  npm install
  npx expo lint
  npx tsc --noEmit
  npx expo export --platform web
  npx expo-doctor
  git diff --check

Prefer all checks passing before preview-prod or production builds.


OTHER USEFUL EXPO / EAS COMMANDS
================================
Check Expo config:
  npx expo config --json

Check public config:
  npx expo config --type public

View build history:
  eas build:list

Android history:
  eas build:list --platform android

iOS history:
  eas build:list --platform ios

Manage Android credentials:
  eas credentials --platform android

Manage iOS credentials:
  eas credentials --platform ios

Inspect EAS config:
  eas config


STANDARD TERMINOLOGY FOR CODEX
==============================
"development"
  = EAS development client

"preview-dev"
  = standalone internal build using DEV backend

"preview-prod"
  = standalone internal build using PROD backend

"production"
  = store release using PROD backend

Android:
  preview-* = APK
  production = AAB

iOS:
  preview-* = Ad Hoc/internal IPA
  production = App Store/TestFlight IPA


EXAMPLE CODEX REQUESTS
======================
"Build preview-dev for Android."
  eas build --platform android --profile preview-dev

"Build preview-prod for iOS."
  eas build --platform ios --profile preview-prod

"Build production Android."
  eas build --platform android --profile production

"Build and submit to TestFlight."
  eas build --platform ios --profile production --auto-submit

"Build an Android dev client."
  eas build --platform android --profile development

"Run a local Android debug build."
  npx expo run:android
  OR:
  cd android && ./gradlew :app:assembleDebug


COMMON WORKFLOWS
================
A. Production-like Android test against DEV backend:
  eas build --platform android --profile preview-dev
  eas build:run --platform android

B. Production-like Android test against PROD backend:
  eas build --platform android --profile preview-prod
  eas build:run --platform android

C. iPhone test against DEV backend:
  eas build --platform ios --profile preview-dev

D. iPhone test against PROD backend:
  eas build --platform ios --profile preview-prod

E. TestFlight:
  eas build --platform ios --profile production --auto-submit

F. Google Play:
  eas build --platform android --profile production
  Upload resulting AAB to Play Console.

G. Send Android APK directly to a tester:
  eas build --platform android --profile preview-prod

H. End-to-end notification test:
  Install a native preview build.
  Enable notifications.
  cd ~/Desktop/queueup-dev
  docker compose exec web python manage.py send_native_test_notification USERNAME


SECURITY / SAFETY RULES
=======================
Before Apple credential/build actions:
- verify com.queueupmusic.queueup
- never modify the organization's unrelated app
- never revoke team-wide certificates/keys without explicit approval

Before EAS cloud builds:
- confirm which EAS environment the profile uses
- confirm EXPO_PUBLIC_API_URL points to the intended backend

Never commit:
- .env secrets
- Firebase Admin SDK private keys
- App Store Connect private API key files
- APNs .p8 private keys
- passwords

Do not assume:
- generic "preview" means DEV
- APKs can be uploaded to Google Play
- Ad Hoc iOS builds can go to TestFlight
- local debug signatures match EAS signatures
