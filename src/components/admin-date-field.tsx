import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, Radii, Spacing } from '@/constants/theme';

function parseDate(value: string): Date {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function localIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function displayDate(value: string): string {
  if (!value) return 'Choose date and time';
  return parseDate(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function AdminDateField({ label, value, onChangeText, optional = false }: { label: string; value: string; onChangeText: (value: string) => void; optional?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [pickerValue, setPickerValue] = useState(() => parseDate(value));
  const open = () => { setPickerValue(parseDate(value)); setVisible(true); };
  const onChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setVisible(false);
    if (event.type === 'dismissed' || !date) return;
    setPickerValue(date); onChangeText(localIso(date));
  };
  return <View style={styles.field}><Text style={styles.label}>{label}{optional ? ' · optional' : ''}</Text><Pressable accessibilityLabel={label} accessibilityRole="button" onPress={open} style={({ pressed }) => [styles.input, pressed && styles.pressed]}><Text style={[styles.value, !value && styles.placeholder]}>{displayDate(value)}</Text></Pressable>{visible ? <View style={styles.pickerWrap}><DateTimePicker display={Platform.OS === 'ios' ? 'inline' : 'default'} mode="datetime" onChange={onChange} value={pickerValue} /><>{Platform.OS === 'ios' ? <Pressable accessibilityRole="button" onPress={() => setVisible(false)} style={styles.done}><Text style={styles.doneText}>Done</Text></Pressable> : null}</></View> : null}{optional && value ? <Pressable accessibilityRole="button" onPress={() => { setVisible(false); onChangeText(''); }}><Text style={styles.clear}>Clear date</Text></Pressable> : null}</View>;
}

const styles = StyleSheet.create({
  field: { marginBottom: Spacing.lg },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: Spacing.sm },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: Radii.small, borderWidth: 1, justifyContent: 'center', minHeight: 52, paddingHorizontal: Spacing.md },
  value: { color: colors.text, fontSize: 16 },
  placeholder: { color: colors.textMuted },
  pickerWrap: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.small, borderWidth: 1, marginTop: Spacing.sm, overflow: 'hidden', padding: Spacing.sm },
  done: { alignSelf: 'stretch', borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, padding: Spacing.sm },
  doneText: { color: colors.brandLight, fontWeight: '800', textAlign: 'right' },
  clear: { color: colors.brandLight, fontSize: 13, fontWeight: '700', marginTop: Spacing.xs },
  pressed: { opacity: 0.78 },
});
