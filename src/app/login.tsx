import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Action, AuthFrame, Brand, ErrorMessage, Field, styles } from '@/components/auth-ui';
import { useAuth } from '@/context/auth';
import { ApiError } from '@/types';

export default function LoginScreen() {
  const router = useRouter(); const auth = useAuth();
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState<ApiError | null>(null); const [busy, setBusy] = useState(false);
  async function submit() { setBusy(true); setError(null); try { await auth.login(username.trim(), password); router.replace('/'); } catch (cause) { setError(cause instanceof ApiError ? cause : ApiError.networkError('Unable to log in')); } finally { setBusy(false); } }
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}><ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled"><AuthFrame><Brand /><Text style={styles.heading}>Welcome back</Text><Text style={styles.subheading}>Log in to continue to QueueUp.</Text><Field label="Username or Email" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} returnKeyType="next" /><Field label="Password" value={password} onChangeText={setPassword} secureTextEntry returnKeyType="go" onSubmitEditing={() => void submit()} /><ErrorMessage message={error?.message} fieldErrors={error?.fieldErrors} /><Action disabled={busy || !username || !password} onPress={() => void submit()}>{busy ? 'Logging in…' : 'Log in'}</Action><Action secondary onPress={() => router.back()}>Back</Action><Text accessibilityRole="link" onPress={() => router.push('/password-reset' as never)} style={styles.link}>Forgot your password?</Text><Text accessibilityRole="link" onPress={() => router.push('/signup' as never)} style={styles.link}>Need an account? Sign up</Text></AuthFrame></ScrollView></KeyboardAvoidingView>;
}
