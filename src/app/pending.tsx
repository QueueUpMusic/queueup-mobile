import { useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Action, AuthFrame, Brand, ErrorMessage, styles } from '@/components/auth-ui';
import { useAuth } from '@/context/auth';

export default function PendingScreen() {
  const router = useRouter(); const { user, refresh, logout, error } = useAuth(); const [busy, setBusy] = useState(false);
  async function recheck() { setBusy(true); await refresh(); setBusy(false); }
  return <AuthFrame><Brand /><Text style={styles.heading}>You’re in the queue</Text><Text style={styles.subheading}>Thanks for joining, {user?.display_name || user?.username || 'there'}. An admin needs to approve your account before you can enter the league.</Text><ErrorMessage message={error?.message} />{busy && <ActivityIndicator color="#7be495" />}<Action disabled={busy} onPress={() => void recheck()}>Recheck approval</Action><Action secondary onPress={() => { void logout().then(() => router.replace('/')); }}>Log out</Action></AuthFrame>;
}
