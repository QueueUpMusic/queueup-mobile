import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdminDateField } from '@/components/admin-date-field';
import { Action, ErrorMessage, Field } from '@/components/auth-ui';
import { ChevronLeft } from '@/components/queueup-icon';
import { colors, Spacing } from '@/constants/theme';
import { getStaffSeasons, saveStaffSeason } from '@/lib/api';
import { ApiError, StaffSeason } from '@/types';

function defaultDate(days: number): string {
  const date = new Date(Date.now() + days * 86400000);
  return date.toISOString().slice(0, 16);
}

export default function NewSeasonScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editId = edit ? Number(edit) : undefined;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState(defaultDate(0));
  const [endsAt, setEndsAt] = useState(defaultDate(90));
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!editId) return;
    void getStaffSeasons().then(({ seasons }) => {
      const season = seasons.find((item) => item.id === editId) as StaffSeason | undefined;
      if (!season) return;
      setName(season.name); setDescription(season.description); setStartsAt(season.starts_at.slice(0, 16)); setEndsAt(season.ends_at.slice(0, 16)); setActive(season.active);
    }).catch((cause) => setError(cause instanceof ApiError ? cause : ApiError.networkError('Unable to load the season.')));
  }, [editId]);

  const save = async () => {
    setSaving(true); setError(null);
    try {
      await saveStaffSeason({ name, description, starts_at: startsAt, ends_at: endsAt, active }, editId);
      router.back();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause : ApiError.networkError('Unable to create the season.'));
    } finally { setSaving(false); }
  };

  const showPicker = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}><View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}><Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={8} onPress={() => router.back()}><ChevronLeft color={colors.text} /></Pressable><Text style={styles.headerTitle}>{editId ? 'Edit season' : 'Create season'}</Text><View style={styles.headerSpacer} /></View><ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text style={styles.kicker}>Staff · Seasons</Text><Text style={styles.title}>{editId ? 'Edit season' : 'New season'}</Text><Text style={styles.subtitle}>Use the same fields as League Control.</Text><Field autoCapitalize="words" label="Name" onChangeText={setName} value={name} /><Field label="Description" multiline onChangeText={setDescription} value={description} /><AdminDateField label="Starts at" onChangeText={setStartsAt} onOpen={showPicker} value={startsAt} /><AdminDateField label="Ends at" onChangeText={setEndsAt} onOpen={showPicker} value={endsAt} /><Pressable accessibilityRole="switch" accessibilityState={{ checked: active }} onPress={() => setActive((value) => !value)} style={styles.toggle}><View style={[styles.toggleTrack, active && styles.toggleTrackActive]}><View style={[styles.toggleThumb, active && styles.toggleThumbActive]} /></View><Text style={styles.toggleLabel}>{active ? 'Active season' : 'Save as inactive'}</Text></Pressable>{error ? <ErrorMessage message={error.message} fieldErrors={error.fieldErrors} /> : null}<Action disabled={saving || !name.trim()} onPress={() => void save()}>{saving ? 'Saving…' : editId ? 'Save changes' : 'Create season'}</Action><Action secondary onPress={() => router.back()}>Cancel</Action></ScrollView></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: 'center', borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', paddingBottom: Spacing.md, paddingHorizontal: Spacing.xl },
  headerTitle: { color: colors.text, flex: 1, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  headerSpacer: { width: 24 },
  content: { alignSelf: 'center', gap: Spacing.sm, maxWidth: 620, padding: Spacing.xl, paddingBottom: Spacing.xxxl, width: '100%' },
  kicker: { color: colors.brandLight, fontSize: 12, fontWeight: '900', letterSpacing: 1.3, marginTop: Spacing.sm, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 32, fontWeight: '900', marginBottom: Spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginBottom: Spacing.md },
  toggle: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.md },
  toggleTrack: { backgroundColor: colors.surfaceHighest, borderColor: colors.border, borderRadius: 14, borderWidth: 1, height: 28, justifyContent: 'center', padding: 2, width: 50 },
  toggleTrackActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  toggleThumb: { backgroundColor: colors.textMuted, borderRadius: 11, height: 22, width: 22 },
  toggleThumbActive: { alignSelf: 'flex-end', backgroundColor: colors.background },
  toggleLabel: { color: colors.text, fontSize: 15, fontWeight: '700' },
});
