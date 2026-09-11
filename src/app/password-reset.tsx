import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Action, AuthFrame, Brand, ErrorMessage, Field, styles } from '@/components/auth-ui';
import { requestPasswordReset } from '@/lib/api';
import { ApiError } from '@/types';

export default function PasswordResetScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause : ApiError.networkError('We couldn’t send the reset email. Check your connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}><ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled"><AuthFrame><Brand /><Text style={styles.heading}>{sent ? 'Check your email' : 'Reset your password'}</Text><Text style={styles.subheading}>{sent ? 'If an account exists for that email, a reset link has been sent. The link is time-limited; check your spam folder if it does not arrive soon.' : 'Enter the email address associated with your QueueUp account.'}</Text>{sent ? <Action onPress={() => router.replace('/login' as never)}>Back to login</Action> : <><Field autoCapitalize="none" autoCorrect={false} keyboardType="email-address" label="Email" onChangeText={setEmail} returnKeyType="send" value={email} /><ErrorMessage message={error?.message} /><Action disabled={busy || !email.trim()} onPress={() => void submit()}>{busy ? 'Sending…' : 'Send reset link'}</Action><Action secondary onPress={() => router.back()}>Back to login</Action></>}</AuthFrame></ScrollView></KeyboardAvoidingView>;
}
