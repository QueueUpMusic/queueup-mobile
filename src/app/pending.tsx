import { Text } from 'react-native';
import { Action, AuthFrame, Brand, styles } from '@/components/auth-ui';
import { useAuth } from '@/context/auth';

export default function PendingScreen() {
  const { user, logout } = useAuth();
  return <AuthFrame><Brand /><Text style={styles.heading}>You’re in the queue</Text><Text style={styles.subheading}>Thanks for joining, {user?.display_name || user?.username || 'there'}. An admin needs to approve your account before you can enter the league.</Text><Text style={styles.subheading}>Waiting for admin approval…</Text><Action secondary onPress={() => { void logout(); }}>Log out</Action></AuthFrame>;
}
