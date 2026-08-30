import { Text } from 'react-native';
import { Action, AuthFrame, Brand, styles } from '@/components/auth-ui';
import { useAuth } from '@/context/auth';

export default function PendingScreen() {
  const { logout } = useAuth();
  return <AuthFrame><Brand /><Text style={styles.heading}>Waiting for approval</Text><Text style={styles.subheading}>Your QueueUp account is ready. An admin just needs to approve you.</Text><Text style={styles.subheading}>Checking automatically…</Text><Action secondary onPress={() => { void logout(); }}>Log out</Action></AuthFrame>;
}
