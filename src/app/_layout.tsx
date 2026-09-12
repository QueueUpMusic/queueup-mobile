import { DarkTheme, DefaultTheme, ThemeProvider, Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Platform, useColorScheme } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from '@/context/auth';
import { StatusBar } from 'expo-status-bar';
import { NativePushOptInModal } from '@/components/native-push-opt-in-modal';
import { enableNativePush } from '@/lib/native-push';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <StatusBar style="light" />
        <AuthStack />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AuthStack() {
  const { status, user, onboarding, acknowledgeNativePushPrompt } = useAuth();
  const isStaff = Boolean(user?.is_staff || user?.is_superuser);
  const splashHidden = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web' || status === 'booting' || splashHidden.current) return;
    splashHidden.current = true;
    void SplashScreen.hideAsync().catch((error) => {
      if (__DEV__) console.warn('QueueUp splash screen could not be hidden:', error);
    });
  }, [status]);

  const showNativePushPrompt = status === 'approved' && onboarding?.native_push_prompt_seen === false;
  const handleEnableNotifications = async () => {
    const result = await enableNativePush();
    if (result.status === 'failed') return { message: result.message ?? 'We could not enable notifications right now.', keepOpen: true };
    await acknowledgeNativePushPrompt();
    return {};
  };
  const handleDismissNotifications = async () => { await acknowledgeNativePushPrompt(); };
  return <><NotificationNavigation /><Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="native-entry" options={{ animation: 'none' }} />
    <Stack.Protected guard={status !== 'approved' && status !== 'pending'}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
    </Stack.Protected>
    <Stack.Protected guard={status === 'logged_out'}>
      <Stack.Screen name="login" />
      <Stack.Screen name="password-reset" />
      <Stack.Screen name="signup" />
    </Stack.Protected>
    <Stack.Protected guard={status === 'pending'}>
      <Stack.Screen name="pending" />
    </Stack.Protected>
    <Stack.Protected guard={status === 'approved'}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="round/[id]" />
      <Stack.Screen name="round/[id]/submit" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="round/[id]/vote" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="round/[id]/vote/complete" options={{ animation: 'fade' }} />
      <Stack.Screen name="season/[id]/recap" options={{ animation: 'slide_from_right' }} />
      <Stack.Protected guard={isStaff}>
        <Stack.Screen name="admin/rounds/new" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin/rounds/edit" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin/rounds" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin/rounds/[id]/stats" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin/players" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin/badges" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin/badges/edit" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin/countdowns" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin/notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin/notifications/new" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin/countdowns/edit" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin/seasons" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin/seasons/new" options={{ animation: 'slide_from_right' }} />
      </Stack.Protected>
      <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="profile/[username]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="profile/edit" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings" />
    </Stack.Protected>
  </Stack><NativePushOptInModal visible={showNativePushPrompt} onEnable={handleEnableNotifications} onDismiss={handleDismissNotifications} /></>;
}

function NotificationNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuth();
  const pendingRoute = useRef<string | null>(null);
  const handledResponse = useRef<string | null>(null);
  const statusRef = useRef(status);
  const pathnameRef = useRef(pathname);
  const [initialResponseResolved, setInitialResponseResolved] = useState(Platform.OS === 'web');

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const navigate = (response: Notifications.NotificationResponse | null) => {
      if (!response || handledResponse.current === response.notification.request.identifier) return;
      handledResponse.current = response.notification.request.identifier;
      const destination = getSafeNotificationRoute(response.notification.request.content.data?.route) ?? '/(app)';
      if (statusRef.current === 'approved' && pathnameRef.current !== '/native-entry') router.push(destination as never);
      else pendingRoute.current = destination;
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(navigate);
    void Notifications.getLastNotificationResponseAsync()
      .then(navigate)
      .finally(() => setInitialResponseResolved(true));
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (!initialResponseResolved || pathname !== '/native-entry' || status === 'booting') return;
    if (pendingRoute.current && status === 'approved') {
      const route = pendingRoute.current;
      pendingRoute.current = null;
      router.replace(route as never);
      return;
    }
    if (status === 'approved') router.replace('/(app)' as never);
    else if (status === 'pending') router.replace('/pending' as never);
    else if (status === 'logged_out' || status === 'network_error') router.replace('/' as never);
  }, [initialResponseResolved, pathname, router, status]);
  return null;
}

function getSafeNotificationRoute(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const route = value.trim();
  if (route === '/' || route === '/home' || route === '/home/') return '/(app)';
  if (route.startsWith('//') || !route.startsWith('/') || route.includes('://') || route.toLowerCase().startsWith('/javascript:')) return null;

  const statsMatch = route.match(/^\/stats\/([^/]+)\/?$/);
  if (statsMatch) return `/profile/${encodeURIComponent(statsMatch[1])}`;
  const recapMatch = route.match(/^\/seasons\/(\d+)\/recap\/?$/);
  if (recapMatch) return `/season/${recapMatch[1]}/recap`;

  if (/^\/round\/\d+(?:\/(?:submit|vote))?\/?$/.test(route)) return route.replace(/\/$/, '');
  if (/^\/season\/\d+\/recap\/?$/.test(route)) return route.replace(/\/$/, '');
  if (route === '/profile' || /^\/profile\/[A-Za-z0-9_.-]+\/?$/.test(route)) return route.replace(/\/$/, '') || '/profile';
  return null;
}
