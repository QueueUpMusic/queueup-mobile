import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getNativePushDeviceStatus, registerNativePushDevice, unregisterNativePushDevice } from '@/lib/api';

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

type NotificationPermission = 'granted' | 'denied' | 'undetermined';

export type NativePushStatus = {
  permission: NotificationPermission;
  registered: boolean;
};

export async function getNativePushStatus(): Promise<NativePushStatus> {
  if (Platform.OS === 'web') return { permission: 'denied', registered: false };
  const permission = (await Notifications.getPermissionsAsync()).status;
  let registered = Boolean(registeredToken);
  if (permission === 'granted' && projectId()) {
    try {
      const token = (await Notifications.getExpoPushTokenAsync({ projectId: projectId()! })).data;
      registeredToken = token;
      registered = (await getNativePushDeviceStatus(token)).registered;
    } catch {
      // Settings can still show the local permission state when the API is unavailable.
    }
  }
  return {
    permission: permission === 'granted' ? 'granted' : permission === 'denied' ? 'denied' : 'undetermined',
    registered,
  };
}

async function registerNativePushInternal(): Promise<void> {
  if (Platform.OS === 'web' || registrationPromise) return registrationPromise ?? Promise.resolve();
  registrationPromise = (async () => {
    const permission = (await Notifications.getPermissionsAsync()).status;
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
  }).finally(() => { registrationPromise = null; });
  return registrationPromise;
}

export async function enableNativePush(): Promise<{ status: 'enabled' | 'denied' | 'failed'; message?: string }> {
  if (Platform.OS === 'web') return { status: 'failed', message: 'Notifications are unavailable on the web.' };
  try {
    let permission = (await Notifications.getPermissionsAsync()).status;
    if (permission !== 'granted') permission = (await Notifications.requestPermissionsAsync()).status;
    if (permission !== 'granted') return { status: 'denied' };
    await registerNativePushInternal();
    if (!registeredToken) return { status: 'failed', message: 'QueueUp could not register this device.' };
    return { status: 'enabled' };
  } catch (error) {
    return { status: 'failed', message: error instanceof Error ? error.message : 'QueueUp could not enable notifications.' };
  }
}

export async function unregisterNativePush(): Promise<void> {
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  try { await unregisterNativePushDevice(token); } catch { /* logout remains best-effort */ }
}

export function addNativePushTokenListener(): Notifications.EventSubscription | null {
  if (Platform.OS === 'web') return null;
  return Notifications.addPushTokenListener(() => { void registerNativePushInternal(); });
}

export async function scheduleLocalTestNotification(): Promise<void> {
  if (!__DEV__) return;
  await Notifications.scheduleNotificationAsync({ content: { title: 'QueueUp test notification', body: 'Local notification routing is ready.', data: { type: 'local_test', route: '/(app)' } }, trigger: null });
}
