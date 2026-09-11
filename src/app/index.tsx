import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorMessage } from '@/components/auth-ui';
import { colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
const logo = require('../../assets/images/queueup-logo-transparent.png');

function WelcomeButton({ children, secondary = false, onPress }: { children: string; secondary?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, pressed && styles.pressed]}><Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{children}</Text></Pressable>;
}
export default function QueueUpShellScreen() {
  const { status, error, refresh } = useAuth(); const router = useRouter();
  useEffect(() => { if (status === 'pending') router.replace('/pending' as never); if (status === 'approved') router.replace('/(app)' as never); }, [router, status]);
  if (status === 'booting') return <WelcomeBackground><ActivityIndicator color={colors.brand} /></WelcomeBackground>;
  if (status === 'network_error') return <WelcomeBackground><View style={styles.centerMessage}><Text style={styles.title}>Can’t reach QueueUp</Text><Text style={styles.subtitle}>Your session may still be valid. Check your connection and try again.</Text><ErrorMessage message={error?.message} /><WelcomeButton onPress={() => void refresh()}>Try again</WelcomeButton></View></WelcomeBackground>;
  if (status === 'pending' || status === 'approved') return <WelcomeBackground><ActivityIndicator color={colors.brand} /></WelcomeBackground>;
  return <WelcomeBackground><View style={styles.main}><View style={styles.brandBlock}><Image accessibilityLabel="QueueUp logo" resizeMode="contain" source={logo} style={styles.logo} /><Text style={styles.wordmark}>QueueUp</Text><Text style={styles.subtitle}>Your music league, together.</Text></View><View style={styles.actions}><WelcomeButton onPress={() => router.push('/login' as never)}>Log in</WelcomeButton><WelcomeButton onPress={() => router.push('/signup' as never)} secondary>Sign up</WelcomeButton></View></View></WelcomeBackground>;
}
function WelcomeBackground({ children }: { children: React.ReactNode }) {
  return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}><View pointerEvents="none" style={StyleSheet.absoluteFill}><View style={styles.glowLarge} /><View style={styles.glowSmall} /><View style={styles.orbTop} /><View style={styles.orbBottom} /><View style={styles.equalizer}>{[0.35, 0.58, 0.8, 0.45, 0.68, 0.3, 0.52].map((height, index) => <View key={index} style={[styles.bar, { height: `${height * 100}%` }]} />)}</View></View>{children}</SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 }, main: { alignItems: 'center', flex: 1, justifyContent: 'space-between', paddingBottom: Spacing.lg, paddingHorizontal: Spacing.xl, paddingTop: '17%' }, brandBlock: { alignItems: 'center', justifyContent: 'center' }, logo: { height: 128, width: 128 }, wordmark: { color: colors.text, fontSize: 42, fontWeight: '900', letterSpacing: -1.5, marginTop: Spacing.md }, title: { color: colors.text, fontSize: 28, fontWeight: '900', textAlign: 'center' }, subtitle: { color: colors.textMuted, fontSize: 17, lineHeight: 24, marginTop: Spacing.sm, textAlign: 'center' }, actions: { gap: Spacing.md, maxWidth: 520, width: '100%' }, button: { alignItems: 'center', backgroundColor: colors.brand, borderRadius: Radii.medium, justifyContent: 'center', minHeight: 56, paddingHorizontal: Spacing.lg }, buttonText: { color: colors.background, fontSize: 17, fontWeight: '900' }, secondaryButton: { backgroundColor: 'rgba(18, 34, 29, 0.82)', borderColor: colors.brand, borderWidth: 1 }, secondaryButtonText: { color: colors.brandLight }, centerMessage: { alignItems: 'center', gap: Spacing.md, justifyContent: 'center', maxWidth: 520, padding: Spacing.xl, width: '100%' }, pressed: { opacity: 0.78 }, glowLarge: { backgroundColor: 'rgba(25, 211, 109, 0.12)', borderRadius: 320, height: 640, position: 'absolute', right: -230, top: -120, width: 640 }, glowSmall: { backgroundColor: 'rgba(61, 125, 255, 0.08)', borderRadius: 220, bottom: -110, height: 440, left: -160, position: 'absolute', width: 440 }, orbTop: { borderColor: 'rgba(131, 255, 184, 0.18)', borderRadius: 90, borderWidth: 1, height: 180, position: 'absolute', right: '8%', top: '13%', width: 180 }, orbBottom: { backgroundColor: 'rgba(32, 223, 114, 0.05)', borderRadius: 130, bottom: '15%', height: 260, left: '5%', position: 'absolute', width: 260 }, equalizer: { alignItems: 'flex-end', bottom: '20%', flexDirection: 'row', gap: 7, height: 48, opacity: 0.22, position: 'absolute', right: '10%', width: 105 }, bar: { backgroundColor: colors.brand, borderRadius: 4, flex: 1, minHeight: 10 },
});
