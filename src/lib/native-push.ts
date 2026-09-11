import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { registerNativePushDevice, unregisterNativePushDevice } from '@/lib/api';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

let registeredToken: string | null = null;
let registrationPromise: Promise<void> | null = null;

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export async function registerNativePush(): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice || registrationPromise) return registrationPromise ?? Promise.resolve();
  registrationPromise = (async () => {
    const existing = await Notifications.getPermissionsAsync();
    let permission = existing.status;
    if (permission !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      permission = requested.status;
    }
    if (permission !== 'granted') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'QueueUp', importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 250, 250, 250] });
    }
    const id = projectId();
    if (!id) return;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
    if (token === registeredToken) return;
    await registerNativePushDevice({ expo_push_token: token, platform: Platform.OS === 'ios' ? 'ios' : 'android', app_version: Constants.expoConfig?.version });
    registeredToken = token;
  })().catch(() => {
    // Push registration is optional and must never block QueueUp.
  }).finally(() => { registrationPromise = null; });
  return registrationPromise;
}

export async function unregisterNativePush(): Promise<void> {
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  try { await unregisterNativePushDevice(token); } catch { /* logout remains best-effort */ }
}

export function addNativePushTokenListener(): Notifications.EventSubscription | null {
  if (Platform.OS === 'web') return null;
  return Notifications.addPushTokenListener(() => { void registerNativePush(); });
}

export async function scheduleLocalTestNotification(): Promise<void> {
  if (!__DEV__) return;
  await Notifications.scheduleNotificationAsync({ content: { title: 'QueueUp test notification', body: 'Local notification routing is ready.', data: { type: 'local_test', route: '/(app)' } }, trigger: null });
}
