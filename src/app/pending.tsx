import { Text } from 'react-native';
import { AuthFrame, Brand, styles } from '@/components/auth-ui';
import { AccountActions } from '@/components/account-actions';

export default function PendingScreen() {
  return <AuthFrame><Brand /><Text style={styles.heading}>Waiting for approval</Text><Text style={styles.subheading}>Your QueueUp account is ready. An admin just needs to approve you.</Text><Text style={styles.subheading}>Checking automatically…</Text><AccountActions /></AuthFrame>;
}
