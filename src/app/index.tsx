import { ActivityIndicator, Text } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Action, AuthFrame, Brand, ErrorMessage, styles } from '@/components/auth-ui';
import { useAuth } from '@/context/auth';

/**
 * Initial QueueUp app shell screen.
 * 
 * Shows:
 * - QueueUp title
 * - Current server hostname
 * - Server connectivity status
 * 
 * This will eventually become the login/signup screen.
 */
export default function QueueUpShellScreen() {
  const { status, error, refresh } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (status === 'pending') router.replace('/pending' as never);
    if (status === 'approved') router.replace('/(app)' as never);
  }, [router, status]);
  if (status === 'booting') return <AuthFrame><ActivityIndicator color="#7be495" /></AuthFrame>;
  if (status === 'network_error') return <AuthFrame><Brand /><Text style={styles.heading}>Can’t reach QueueUp</Text><Text style={styles.subheading}>Your session may still be valid. Check your connection and try again.</Text><ErrorMessage message={error?.message} /><Action onPress={() => void refresh()}>Try again</Action></AuthFrame>;
  if (status === 'pending' || status === 'approved') return <AuthFrame><ActivityIndicator color="#7be495" /></AuthFrame>;
  return <AuthFrame><Brand /><Text style={styles.heading}>Your music league, together.</Text><Text style={styles.subheading}>Join the QueueUp community, share your picks, and discover what everyone is listening to.</Text><Action onPress={() => router.push('/login' as never)}>Log in</Action><Action secondary onPress={() => router.push('/signup' as never)}>Sign up</Action></AuthFrame>;
}
