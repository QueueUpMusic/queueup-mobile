import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { AuthProvider, useAuth } from '@/context/auth';
import { StatusBar } from 'expo-status-bar';

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
  const { status } = useAuth();
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="index" />
    <Stack.Protected guard={status === 'logged_out'}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack.Protected>
    <Stack.Protected guard={status === 'pending'}>
      <Stack.Screen name="pending" />
    </Stack.Protected>
    <Stack.Protected guard={status === 'approved'}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="round/[id]" />
      <Stack.Screen name="round/[id]/submit" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings" />
    </Stack.Protected>
  </Stack>;
}
