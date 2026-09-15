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

Do not construct the notification request manually with `curl`.

Always use the repository notification script:

```bash
./scripts/notify-eas-build-started.sh <platform>
```

Valid platform values are:

- `ios`
- `android`
- `all`

Examples:

```bash
./scripts/notify-eas-build-started.sh ios
```

```bash
./scripts/notify-eas-build-started.sh android
```

```bash
./scripts/notify-eas-build-started.sh all
```

## Required Agent Procedure

For EVERY `eas build` command:

1. Read this file before starting the build.
2. Determine the requested platform and EAS profile.
3. Start the requested EAS build using the appropriate command from `AGENTS.md`.
4. Wait until EAS has successfully accepted and created the build.
5. Immediately run the repository notification script with the correct platform.
6. Verify that the notification script exits successfully.
7. Continue with the requested work normally.

Do NOT send the build-started notification before EAS has actually accepted and created the build.

Do NOT send the build-started notification if the EAS command fails before a build is created.

Do NOT send the build-started notification twice for the same build.

Do NOT manually construct the HTTP request.

Always use:

```bash
./scripts/notify-eas-build-started.sh <platform>
```

## Notification Failure Behavior

If the EAS build starts successfully but the notification script fails:

1. Do not cancel the EAS build.
2. Do not restart the EAS build.
3. Report that the EAS build started successfully but the notification failed.
4. Include the notification script's error output when useful.

A notification failure does NOT mean the EAS build itself failed.

## iOS Example

Start the EAS build:

```bash
eas build --platform ios --profile production
```

After EAS confirms that the build has been created, run:

```bash
./scripts/notify-eas-build-started.sh ios
```

## Android Example

Start the EAS build:

```bash
eas build --platform android --profile production
```

After EAS confirms that the build has been created, run:

```bash
./scripts/notify-eas-build-started.sh android
```

## Both Platforms Example

Start the EAS build:

```bash
eas build --platform all --profile production
```

After EAS confirms that the builds have been created, run:

```bash
./scripts/notify-eas-build-started.sh all
```

## Auto-Submit Example

For:

```bash
eas build --platform ios --profile production --auto-submit
```

after EAS confirms that the build has been created, run:

```bash
./scripts/notify-eas-build-started.sh ios
```

The presence of `--auto-submit` does not change the notification procedure.

## EAS Profiles

The build-started notification requirement applies to all QueueUp Mobile EAS profiles, including:

- `development`
- `preview-dev`
- `preview-prod`
- `production`

It applies regardless of profile.

It also applies regardless of whether the build uses additional EAS options such as:

```text
--auto-submit
```

## Completion Notifications

Do NOT manually send a notification when an EAS build completes.

The Expo `BUILD` webhook is configured to send build results automatically to:

```text
https://queueup-ntfy-receiver.kingdmvr.com/eas-webhook
```

That webhook handles:

- successful builds
- failed builds
- canceled builds

The agent does not need to call the completion endpoint directly.

The agent does not need to publish directly to ntfy.

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

- direct Gradle builds
- starting Metro
- installing an already-completed EAS build
- running an Android emulator
- installing an APK with ADB
- submitting an already-existing build without creating a new EAS build

## Important Agent Rules

Before starting ANY EAS cloud build:

1. Read `EAS_NOTIFICATIONS.md`.
2. Read the relevant build command in `AGENTS.md`.
3. Start the requested EAS build.
4. Confirm that EAS accepted and created the build.
5. Run exactly one build-started notification script call.
6. Verify the script succeeds.
7. Let Expo's configured webhook handle completion, failure, or cancellation notifications.

Never expose notification service credentials or Expo credentials in:

- commits
- logs
- issue comments
- pull requests
- documentation

Do not edit the notification receiver URL directly into ad hoc shell commands.

Use the repository script so notification behavior remains centralized and consistent.
