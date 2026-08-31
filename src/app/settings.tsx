import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, LogOutIcon } from '@/components/queueup-icon';
import { colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); }
  };

  return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
    <View style={styles.header}><Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><ChevronLeft color={colors.brand} size={24} /><Text style={styles.backLabel}>Profile</Text></Pressable><Text style={styles.headerTitle}>Settings</Text><View style={styles.headerSpacer} /></View>
    <View style={styles.content}><Text style={styles.title}>Settings</Text><Text style={styles.subtitle}>Account and app preferences will live here.</Text><View style={styles.divider} />
      <Pressable accessibilityRole="button" disabled={loggingOut} onPress={() => void handleLogout()} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed, loggingOut && styles.disabled]}><View style={styles.logoutContent}>{loggingOut ? <ActivityIndicator color={colors.text} /> : <LogOutIcon color={colors.text} size={21} />}<Text style={styles.logoutText}>{loggingOut ? 'Logging out…' : 'Log out'}</Text></View></Pressable>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: 'center', borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: Spacing.lg },
  back: { alignItems: 'center', flexDirection: 'row', gap: Spacing.xs, minHeight: 44, minWidth: 84 },
  backLabel: { color: colors.brandLight, fontSize: 15, fontWeight: '700' },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  headerSpacer: { minWidth: 84 },
  content: { gap: Spacing.md, padding: Spacing.xl },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: colors.textMuted, fontSize: 16, lineHeight: 24 },
  divider: { backgroundColor: colors.borderSoft, height: StyleSheet.hairlineWidth, marginVertical: Spacing.md },
  logoutButton: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.small, borderWidth: 1, justifyContent: 'center', minHeight: 52, paddingHorizontal: Spacing.lg },
  logoutContent: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  logoutText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.76 },
});
