import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, ChevronLeft, LogOutIcon } from '@/components/queueup-icon';
import { colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { disableNativePush, enableNativePush, getNativePushStatus, NativePushStatus, scheduleLocalTestNotification } from '@/lib/native-push';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [pushStatus, setPushStatus] = useState<NativePushStatus | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  const refreshPushStatus = useCallback(async () => {
    try { setPushStatus(await getNativePushStatus()); } catch { /* keep the last known status */ }
  }, []);

  useFocusEffect(useCallback(() => {
    void refreshPushStatus();
  }, [refreshPushStatus]));

  const enableNotifications = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    const result = await enableNativePush();
    await refreshPushStatus();
    setPushBusy(false);
    if (result.status === 'denied') Alert.alert('Notifications are off', 'Allow QueueUp notifications in your device settings to stay up to date.');
    if (result.status === 'failed') Alert.alert('Could not enable notifications', result.message ?? 'Please try again later.');
  };

  const disableNotifications = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    await disableNativePush();
    await refreshPushStatus();
    setPushBusy(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); }
  };

  return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
    <View style={styles.header}><Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><ChevronLeft color={colors.brand} size={24} /><Text style={styles.backLabel}>Profile</Text></Pressable><Text style={styles.headerTitle}>Settings</Text><View style={styles.headerSpacer} /></View>
    <View style={styles.content}><Text style={styles.title}>Settings</Text><Text style={styles.subtitle}>Manage your QueueUp experience.</Text>
      <View style={styles.section}><Text style={styles.sectionTitle}>Notifications</Text><Text style={styles.sectionDescription}>{pushStatus?.permission === 'denied' ? 'Permission denied in device settings.' : pushStatus?.registered ? 'QueueUp notifications are enabled on this device.' : 'Get updates when rounds open, voting starts, and results are ready.'}</Text>
        {pushStatus?.permission === 'denied' ? <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}><Text style={styles.actionText}>Open system settings</Text></Pressable> : pushStatus?.registered ? <Pressable accessibilityRole="button" disabled={pushBusy} onPress={() => void disableNotifications()} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed, pushBusy && styles.disabled]}><Text style={styles.actionText}>{pushBusy ? 'Updating…' : 'Disable QueueUp notifications'}</Text></Pressable> : <Pressable accessibilityRole="button" disabled={pushBusy} onPress={() => void enableNotifications()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, pushBusy && styles.disabled]}><Text style={styles.primaryText}>{pushBusy ? 'Enabling…' : 'Enable notifications'}</Text></Pressable>}
      </View>
      <Pressable accessibilityHint="Opens information about QueueUp" accessibilityRole="button" onPress={() => router.push('/about' as never)} style={({ pressed }) => [styles.aboutButton, pressed && styles.pressed]}><View><Text style={styles.aboutTitle}>About this app</Text><Text style={styles.aboutCopy}>Version and app information</Text></View><ArrowRight color={colors.brandLight} size={20} /></Pressable>
      <View style={styles.divider} />
      <Pressable accessibilityRole="button" disabled={loggingOut} onPress={() => void handleLogout()} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed, loggingOut && styles.disabled]}><View style={styles.logoutContent}>{loggingOut ? <ActivityIndicator color={colors.text} /> : <LogOutIcon color={colors.text} size={21} />}<Text style={styles.logoutText}>{loggingOut ? 'Logging out…' : 'Log out'}</Text></View></Pressable>
      {__DEV__ && <Pressable accessibilityRole="button" onPress={() => void scheduleLocalTestNotification().then(() => Alert.alert('Test notification scheduled', 'The local notification will appear shortly.')).catch(() => Alert.alert('Notification unavailable', 'Local notifications could not be scheduled on this device.'))} style={({ pressed }) => [styles.testButton, pressed && styles.pressed]}><Text style={styles.testButtonText}>Send local notification test</Text></Pressable>}
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
  section: { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.medium, borderWidth: 1, gap: Spacing.sm, padding: Spacing.lg },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  sectionDescription: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  aboutButton: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.medium, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 68, paddingHorizontal: Spacing.lg },
  aboutTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  aboutCopy: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.brand, borderRadius: Radii.small, justifyContent: 'center', minHeight: 48, paddingHorizontal: Spacing.md },
  primaryText: { color: colors.background, fontSize: 14, fontWeight: '900' },
  actionButton: { alignItems: 'center', borderColor: colors.borderSoft, borderRadius: Radii.small, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: Spacing.md },
  actionText: { color: colors.brandLight, fontSize: 14, fontWeight: '800' },
  divider: { backgroundColor: colors.borderSoft, height: StyleSheet.hairlineWidth, marginVertical: Spacing.md },
  logoutButton: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.small, borderWidth: 1, justifyContent: 'center', minHeight: 52, paddingHorizontal: Spacing.lg },
  logoutContent: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  logoutText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  testButton: { alignItems: 'center', borderColor: colors.border, borderRadius: Radii.small, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: Spacing.lg },
  testButtonText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.76 },
});
