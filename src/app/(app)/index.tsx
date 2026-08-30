import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Action, AuthFrame, Brand, styles } from '@/components/auth-ui';
import { useAuth } from '@/context/auth';

export default function ApprovedPlaceholder() {
  const router = useRouter(); const { user, logout } = useAuth();
  return <AuthFrame><Brand /><Text style={styles.heading}>You’re in.</Text><Text style={styles.subheading}>Welcome, {user?.display_name || user?.username || 'QueueUp player'}. The player experience is coming next.</Text><Action secondary onPress={() => { void logout().then(() => router.replace('/')); }}>Log out</Action></AuthFrame>;
}
