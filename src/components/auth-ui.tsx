import { PropsWithChildren } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, Radii, Spacing } from '@/constants/theme';

const logo = require('../../assets/images/queueup-logo.png');

export function AuthFrame({ children }: PropsWithChildren) {
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><View style={styles.content}>{children}</View></SafeAreaView>;
}

export function Brand({ compact = false }: { compact?: boolean }) { return <View style={[styles.brandRow, compact && styles.compactBrandRow]}><Image accessibilityLabel="QueueUp logo" source={logo} style={styles.logo} /><Text style={styles.brand}>QueueUp</Text></View>; }

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} accessibilityLabel={label} placeholderTextColor={colors.textMuted} selectionColor={colors.brand} style={styles.input} /></View>;
}

export function Action({ children, onPress, secondary = false, disabled = false }: PropsWithChildren<{ onPress: () => void; secondary?: boolean; disabled?: boolean }>) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, disabled && styles.disabled, pressed && styles.pressed]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{children}</Text></Pressable>;
}

export function ErrorMessage({ message, fieldErrors }: { message?: string | null; fieldErrors?: Record<string, string[]> }) { const fields = fieldErrors ? Object.values(fieldErrors).flat() : []; return message || fields.length ? <Text accessibilityRole="alert" style={styles.error}>{[message, ...fields].filter(Boolean).join(' ')}</Text> : null; }

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl, justifyContent: 'center' },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xxl },
  compactBrandRow: { marginBottom: 0 },
  logo: { width: 48, height: 48, borderRadius: Radii.small },
  brand: { color: colors.text, fontSize: 27, fontWeight: '800', letterSpacing: -0.8 },
  heading: { color: colors.text, fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8, marginBottom: Spacing.sm },
  subheading: { color: colors.textMuted, fontSize: 16, lineHeight: 24, marginBottom: Spacing.xl },
  field: { marginBottom: Spacing.lg },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: Spacing.sm },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: Radii.small, color: colors.text, fontSize: 16, minHeight: 52, paddingHorizontal: Spacing.md },
  button: { alignItems: 'center', backgroundColor: colors.brand, borderRadius: Radii.small, minHeight: 52, justifyContent: 'center', paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
  secondary: { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 },
  buttonText: { color: colors.background, fontSize: 16, fontWeight: '800' },
  secondaryText: { color: colors.text },
  disabled: { opacity: 0.5 }, pressed: { opacity: 0.78 },
  error: { backgroundColor: 'rgba(255, 107, 125, 0.1)', borderColor: 'rgba(255, 107, 125, 0.35)', borderRadius: Radii.small, borderWidth: 1, color: '#ffd1d8', lineHeight: 21, marginVertical: Spacing.sm, padding: Spacing.md },
  link: { color: colors.brandLight, fontSize: 15, textAlign: 'center', padding: Spacing.md },
  checkRow: { alignItems: 'center', flexDirection: 'row', marginVertical: Spacing.sm },
  checkbox: { alignItems: 'center', borderColor: colors.border, borderRadius: 6, borderWidth: 1, height: 24, justifyContent: 'center', marginRight: Spacing.md, width: 24 },
  checked: { backgroundColor: colors.brand, borderColor: colors.brand }, check: { color: colors.background, fontWeight: '800' }, checkText: { color: colors.textMuted, flex: 1, lineHeight: 21 },
});
