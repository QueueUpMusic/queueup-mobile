# EAS Build Notifications

QueueUp Mobile has automatic mobile notifications for EAS build activity.

## Notification Receiver

The QueueUp notification receiver is:

```text
https://queueup-ntfy-receiver.kingdmvr.com
```

Expo's configured `BUILD` webhook automatically handles notifications when an EAS build finishes, fails, or is canceled.

Agents MUST NOT manually send completion notifications.

## Build-Started Notification

Expo does not automatically notify the receiver when a build starts.

Therefore, whenever an agent starts an EAS cloud build, the agent MUST notify the receiver after EAS has successfully accepted and created the build.

Endpoint:

```text
POST https://queueup-ntfy-receiver.kingdmvr.com/build-started
```

JSON body:

```json
{
  "project": "QueueUp",
  "platform": "ios"
}
```

Valid `platform` values are:

- `ios`
- `android`
- `all`

## Required Agent Procedure

For EVERY `eas build` command:

1. Start the requested EAS build using the appropriate profile.
2. Wait until EAS has successfully accepted/created the build.
3. Immediately call the build-started notification endpoint.
4. Continue with the requested work normally.

Do NOT send the build-started notification if the EAS command fails before a build is created.

Do NOT send the build-started notification twice for the same build.

A notification failure does NOT mean the EAS build failed. If the notification request fails, report that failure separately. Do not restart or cancel an otherwise successful EAS build.

## Notification Command

After EAS accepts the build, run:

```bash
curl --fail --silent --show-error \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"project":"QueueUp","platform":"ios"}' \
  https://queueup-ntfy-receiver.kingdmvr.com/build-started
```

Replace `ios` with `android` or `all` as appropriate.

## iOS Example

Start the EAS build:

```bash
eas build --platform ios --profile production
```

After EAS accepts and creates the build, run:

```bash
curl --fail --silent --show-error \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"project":"QueueUp","platform":"ios"}' \
  https://queueup-ntfy-receiver.kingdmvr.com/build-started
```

## Android Example

Start the EAS build:

```bash
eas build --platform android --profile production
```

After EAS accepts and creates the build, run:

```bash
curl --fail --silent --show-error \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"project":"QueueUp","platform":"android"}' \
  https://queueup-ntfy-receiver.kingdmvr.com/build-started
```

## Both Platforms Example

Start the EAS build:

```bash
eas build --platform all --profile production
```

After EAS accepts and creates the builds, run:

```bash
curl --fail --silent --show-error \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"project":"QueueUp","platform":"all"}' \
  https://queueup-ntfy-receiver.kingdmvr.com/build-started
```

## EAS Profiles

The build-started notification requirement applies to all QueueUp Mobile EAS profiles, including:

- `development`
- `preview-dev`
- `preview-prod`
- `production`

It also applies when additional EAS options are used, including:

```bash
eas build --platform ios --profile production --auto-submit
```

The presence of `--auto-submit` does not change the notification procedure.

## Completion Notifications

Do NOT manually send a notification when an EAS build completes.

The Expo `BUILD` webhook is configured to send build results automatically to:

```text
https://queueup-ntfy-receiver.kingdmvr.com/eas-webhook
```

That webhook handles:

- Successful builds
- Failed builds
- Canceled builds

The agent does not need to call the completion endpoint or ntfy directly.

## Scope

This notification requirement applies to EAS cloud builds started with:

```text
eas build
```

It does NOT apply to:

```text
npx expo start
npx expo start -c
npx expo run:android
eas build:run
```

It also does not apply to:

- Direct Gradle builds
- Starting Metro
- Installing an already-completed EAS build
- Running an Android emulator
- Installing an APK with ADB
- Submitting an already-existing build without creating a new EAS build

## Important Agent Rules

Before starting ANY EAS cloud build:

1. Read this file.
2. Determine the requested platform and EAS profile.
3. Use the build command documented in `AGENTS.md`.
4. Start the EAS build.
5. Confirm EAS successfully accepted/created the build.
6. Send exactly one build-started notification.
7. Allow Expo's configured webhook to handle the eventual completion notification.

Never expose notification service credentials or Expo credentials in commits, logs, issue comments, or pull requests.
