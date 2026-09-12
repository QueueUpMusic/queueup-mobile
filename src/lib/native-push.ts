import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { disableNativePushDevice, getNativePushDeviceStatus, registerNativePushDevice, unregisterNativePushDevice } from '@/lib/api';

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
let installationIdPromise: Promise<string> | null = null;

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

async function installationId(): Promise<string> {
  if (!installationIdPromise) {
    installationIdPromise = (async () => {
      const key = 'queueup.native.installation-id';
      const existing = await SecureStore.getItemAsync(key);
      if (existing) return existing;
      const generated = `install-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
      await SecureStore.setItemAsync(key, generated);
      return generated;
    })();
  }
  return installationIdPromise;
}

async function resolveCurrentToken(): Promise<string | null> {
  if (registeredToken || Platform.OS === 'web' || !projectId()) return registeredToken;
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') return null;
    registeredToken = (await Notifications.getExpoPushTokenAsync({ projectId: projectId()! })).data;
    return registeredToken;
  } catch {
    return null;
  }
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
      const token = await resolveCurrentToken();
      if (!token) return { permission: 'granted', registered: false };
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
  if (Platform.OS === 'web' || registrationPromise || !projectId()) return registrationPromise ?? Promise.resolve();
  registrationPromise = (async () => {
    const permission = (await Notifications.getPermissionsAsync()).status;
    if (permission !== 'granted') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'QueueUp', importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 250, 250, 250] });
    }
    const id = projectId()!;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
    await registerNativePushDevice({ expo_push_token: token, installation_id: await installationId(), platform: Platform.OS === 'ios' ? 'ios' : 'android', app_version: Constants.expoConfig?.version });
    registeredToken = token;
  })().finally(() => { registrationPromise = null; });
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

export async function refreshNativePushRegistration(): Promise<void> {
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status === 'granted') await registerNativePushInternal();
}

export async function unregisterNativePush(): Promise<void> {
  const token = await resolveCurrentToken();
  registeredToken = null;
  if (!token) return;
  try { await unregisterNativePushDevice(token); } catch { /* logout remains best-effort */ }
}

export async function disableNativePush(): Promise<void> {
  const token = await resolveCurrentToken();
  if (!token) return;
  await disableNativePushDevice(token);
  registeredToken = null;
}

export function addNativePushTokenListener(): Notifications.EventSubscription | null {
  if (Platform.OS === 'web') return null;
  return Notifications.addPushTokenListener(() => {
    if (registeredToken) void registerNativePushInternal().catch((error) => {
      if (__DEV__) console.warn('QueueUp push token refresh failed:', error);
    });
  });
}

export async function scheduleLocalTestNotification(): Promise<void> {
  if (!__DEV__) return;
  await Notifications.scheduleNotificationAsync({ content: { title: 'QueueUp test notification', body: 'Local notification routing is ready.', data: { type: 'local_test', route: '/(app)' } }, trigger: null });
}
