import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, Radii, Spacing } from '@/constants/theme';

function BellIcon() {
  return <Svg accessibilityLabel="Notifications" fill="none" height={28} viewBox="0 0 24 24" width={28}>
    <Path d="M6.5 10.2a5.5 5.5 0 0 1 11 0v2.1l1.7 3H4.8l1.7-3v-2.1Z" fill={colors.brand} stroke={colors.brand} strokeLinejoin="round" strokeWidth={1.5} />
    <Path d="M9.5 18.1a2.8 2.8 0 0 0 5 0" stroke={colors.brand} strokeLinecap="round" strokeWidth={1.6} />
    <Circle cx="12" cy="3.2" fill={colors.brand} r="1.1" />
  </Svg>;
}

export function NativePushOptInModal({ visible, onEnable, onDismiss }: { visible: boolean; onEnable: () => Promise<{ message?: string; keepOpen?: boolean }>; onDismiss: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (enable: boolean) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      if (enable) {
        const result = await onEnable();
        if (result.message) setError(result.message);
        if (!result.keepOpen) return;
      } else {
        await onDismiss();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not save that choice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return <Modal animationType="fade" onRequestClose={() => { void choose(false); }} presentationStyle="overFullScreen" transparent visible={visible}>
    <View style={styles.backdrop}><View style={styles.card}>
      <View style={styles.icon}><BellIcon /></View>
      <Text style={styles.title}>Stay in the loop</Text>
      <Text style={styles.body}>Get notified when submissions open, voting starts, results are revealed, and other QueueUp updates are ready.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => void choose(true)} style={({ pressed }) => [styles.primary, pressed && styles.pressed, saving && styles.disabled]}>{saving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryText}>Enable notifications</Text>}</Pressable>
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => void choose(false)} style={({ pressed }) => [styles.secondary, pressed && styles.pressed, saving && styles.disabled]}><Text style={styles.secondaryText}>Not now</Text></Pressable>
    </View></View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.78)', flex: 1, justifyContent: 'center', padding: Spacing.xl },
  card: { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.large, borderWidth: 1, gap: Spacing.md, maxWidth: 420, padding: Spacing.xl, width: '100%' },
  icon: { alignItems: 'center', backgroundColor: colors.surfaceHighest, borderRadius: 30, height: 60, justifyContent: 'center', width: 60 },
  title: { color: colors.text, fontSize: 27, fontWeight: '900', letterSpacing: -0.5 },
  body: { color: colors.textMuted, fontSize: 16, lineHeight: 24 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  primary: { alignItems: 'center', backgroundColor: colors.brand, borderRadius: Radii.small, justifyContent: 'center', minHeight: 52, paddingHorizontal: Spacing.lg },
  primaryText: { color: colors.background, fontSize: 16, fontWeight: '900' },
  secondary: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  secondaryText: { color: colors.textMuted, fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.78 },
});
