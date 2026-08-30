import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const colors = { background: '#0b110e', surface: '#142019', text: '#f4f8f5', muted: '#9eada3', accent: '#7be495', danger: '#ff9b9b', border: '#2a3b30' };

export function AuthFrame({ children }: PropsWithChildren) {
  return <SafeAreaView style={styles.safe}><View style={styles.content}>{children}</View></SafeAreaView>;
}

export function Brand() { return <Text style={styles.brand}>Queue<Text style={styles.brandAccent}>Up</Text></Text>; }

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} accessibilityLabel={label} placeholderTextColor="#718078" style={styles.input} /></View>;
}

export function Action({ children, onPress, secondary = false, disabled = false }: PropsWithChildren<{ onPress: () => void; secondary?: boolean; disabled?: boolean }>) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, disabled && styles.disabled, pressed && styles.pressed]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{children}</Text></Pressable>;
}

export function ErrorMessage({ message, fieldErrors }: { message?: string | null; fieldErrors?: Record<string, string[]> }) { const fields = fieldErrors ? Object.values(fieldErrors).flat() : []; return message || fields.length ? <Text accessibilityRole="alert" style={styles.error}>{[message, ...fields].filter(Boolean).join(' ')}</Text> : null; }

export const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, content: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24 }, brand: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -1 }, brandAccent: { color: colors.accent }, heading: { color: colors.text, fontSize: 30, fontWeight: '700', marginTop: 48, marginBottom: 10 }, subheading: { color: colors.muted, fontSize: 16, lineHeight: 24, marginBottom: 28 }, field: { marginBottom: 16 }, label: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }, input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, color: colors.text, fontSize: 16, padding: 14 }, button: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, padding: 15, marginTop: 8 }, secondary: { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1 }, buttonText: { color: '#0b110e', fontSize: 16, fontWeight: '700' }, secondaryText: { color: colors.text }, disabled: { opacity: 0.5 }, pressed: { opacity: 0.8 }, error: { color: colors.danger, lineHeight: 21, marginVertical: 12 }, link: { color: colors.accent, fontSize: 15, textAlign: 'center', padding: 14 }, checkRow: { alignItems: 'center', flexDirection: 'row', marginVertical: 8 }, checkbox: { alignItems: 'center', borderColor: colors.border, borderRadius: 5, borderWidth: 1, height: 24, justifyContent: 'center', marginRight: 10, width: 24 }, checked: { backgroundColor: colors.accent }, check: { color: '#0b110e', fontWeight: '800' }, checkText: { color: colors.muted, flex: 1, lineHeight: 21 } });
