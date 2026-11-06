import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LogOutIcon } from '@/components/queueup-icon';
import { getCurrentServer } from '@/config/server';
import { colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';

export function AccountActions() {
  const { logout } = useAuth();
  const locked = useRef(false);
  const [busy, setBusy] = useState<'logout' | 'delete' | null>(null);

  const release = () => {
    locked.current = false;
    setBusy(null);
  };

  const signOut = async () => {
    try {
      await logout();
      // The protected auth stack removes authenticated screens on success.
    } catch {
      Alert.alert('Could not sign out', 'Please try again. You may still be signed in to QueueUp on this device.');
    } finally {
      release();
    }
  };

  const handleLogout = () => {
    if (locked.current) return;
    locked.current = true;
    setBusy('logout');
    void signOut();
  };

  const continueToWebsite = async () => {
    setBusy('delete');
    try {
      const url = new URL('/account/delete/', getCurrentServer()).toString();
      if (!await Linking.canOpenURL(url)) throw new Error('Browser unavailable');
      // Hand off to the browser before invalidating the Django session.
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open website', 'Your account is still signed in. Please try again when your browser is available.');
      release();
      return;
    }
    await signOut();
  };

  const confirmDeletion = () => {
    if (locked.current) return;
    locked.current = true;
    Alert.alert('Delete Account', "You'll be signed out of QueueUp and redirected to our website to permanently delete your account. Your account won't be deleted until you confirm on the website.", [
      { text: 'Cancel', style: 'cancel', onPress: release },
      { text: 'Continue', style: 'destructive', onPress: () => { void continueToWebsite(); } },
    ], { cancelable: false });
  };

  return <View style={styles.actions}>
    <Pressable accessibilityRole="button" disabled={busy !== null} onPress={handleLogout} style={({ pressed }) => [styles.button, pressed && styles.pressed, busy !== null && styles.disabled]}><View style={styles.row}>{busy === 'logout' ? <ActivityIndicator color={colors.text} /> : <LogOutIcon color={colors.text} size={21} />}<Text style={styles.text}>{busy === 'logout' ? 'Logging out…' : 'Log out'}</Text></View></Pressable>
    <Pressable accessibilityHint="Opens the website after confirmation to finish deleting your account" accessibilityRole="button" disabled={busy !== null} onPress={confirmDeletion} style={({ pressed }) => [styles.button, pressed && styles.pressed, busy !== null && styles.disabled]}><View style={styles.row}>{busy === 'delete' && <ActivityIndicator color={colors.danger} />}<Text style={[styles.text, styles.destructive]}>{busy === 'delete' ? 'Opening website…' : 'Delete Account'}</Text></View></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  actions: { gap: Spacing.md },
  button: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.small, borderWidth: 1, justifyContent: 'center', minHeight: 52, paddingHorizontal: Spacing.lg },
  row: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  text: { color: colors.text, fontSize: 16, fontWeight: '800' },
  destructive: { color: colors.danger },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.76 },
});
