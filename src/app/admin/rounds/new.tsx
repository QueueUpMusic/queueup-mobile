import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Action, ErrorMessage, Field } from '@/components/auth-ui';
import { AdminDateField } from '@/components/admin-date-field';
import { Checkmark, ChevronDown, ChevronLeft } from '@/components/queueup-icon';
import { colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { getStaffSeasons, saveStaffRound } from '@/lib/api';
import { ApiError, StaffSeason } from '@/types';

function dateFromNow(days: number): string { return new Date(Date.now() + days * 86400000).toISOString().slice(0, 16); }

export default function NewRoundScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refresh: refreshSession } = useAuth();
  const [seasons, setSeasons] = useState<StaffSeason[]>([]);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [prompt, setPrompt] = useState('');
  const [details, setDetails] = useState('');
  const [goesLiveAt, setGoesLiveAt] = useState('');
  const [submissionOpens, setSubmissionOpens] = useState(dateFromNow(0));
  const [submissionDeadline, setSubmissionDeadline] = useState(dateFromNow(3));
  const [votingDeadline, setVotingDeadline] = useState(dateFromNow(5));
  const [revealAt, setRevealAt] = useState(dateFromNow(6));
  const [saving, setSaving] = useState(false);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [seasonMenuVisible, setSeasonMenuVisible] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => { void getStaffSeasons().then((result) => { setSeasons(result.seasons); setSeasonId(result.seasons.find((season) => season.active)?.id ?? result.seasons[0]?.id ?? null); }).catch((cause) => setError(cause instanceof ApiError ? cause : ApiError.networkError('Unable to load seasons.'))).finally(() => setLoadingSeasons(false)); }, []);

  const save = useCallback(async (saveAction: 'draft' | 'publish') => {
    if (!seasonId) { setError(ApiError.networkError('Choose a season first.')); return; }
    setSaving(true); setError(null);
    try {
      await saveStaffRound({ season: seasonId, prompt, details, goes_live_at: goesLiveAt || null, submission_opens: submissionOpens, submission_deadline: submissionDeadline, voting_deadline: votingDeadline, reveal_at: revealAt, save_action: saveAction });
      router.back();
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Unable to save the round.');
      if (apiError.statusCode === 401) await refreshSession();
      setError(apiError);
    } finally { setSaving(false); }
  }, [details, goesLiveAt, prompt, refreshSession, revealAt, router, seasonId, submissionDeadline, submissionOpens, votingDeadline]);

  const selectedSeason = seasons.find((season) => season.id === seasonId);
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}><View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}><Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={8} onPress={() => router.back()}><ChevronLeft color={colors.text} /></Pressable><Text style={styles.headerTitle}>Create round</Text><View style={styles.headerSpacer} /></View><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text style={styles.kicker}>Staff · Rounds</Text><Text style={styles.title}>New round</Text><Text style={styles.subtitle}>Set the schedule, then save or save it as a draft.</Text>{loadingSeasons ? <ActivityIndicator color={colors.brand} /> : seasons.length ? <View style={styles.seasonPicker}><Text style={styles.label}>Season</Text><Pressable accessibilityHint="Opens the season list" accessibilityLabel="Choose season" accessibilityRole="button" onPress={() => setSeasonMenuVisible(true)} style={({ pressed }) => [styles.seasonSelector, pressed && styles.pressed]}><View><Text numberOfLines={1} style={styles.seasonSelectorValue}>{selectedSeason?.name ?? 'Choose a season'}</Text>{selectedSeason?.active ? <Text style={styles.activeLabel}>Active season</Text> : null}</View><ChevronDown color={colors.brand} size={21} /></Pressable></View> : <Text style={styles.muted}>Create a season before creating a round.</Text>}<Field label="Prompt" onChangeText={setPrompt} value={prompt} /><View style={styles.detailsField}><Text style={styles.label}>Details (optional)</Text><TextInput accessibilityLabel="Details" multiline onChangeText={setDetails} placeholder="Add context for players" placeholderTextColor={colors.textMuted} selectionColor={colors.brand} style={styles.detailsInput} textAlignVertical="top" value={details} /></View><AdminDateField label="Visible at" onChangeText={setGoesLiveAt} optional value={goesLiveAt} /><AdminDateField label="Submission opens" onChangeText={setSubmissionOpens} value={submissionOpens} /><AdminDateField label="Submission deadline" onChangeText={setSubmissionDeadline} value={submissionDeadline} /><AdminDateField label="Voting deadline" onChangeText={setVotingDeadline} value={votingDeadline} /><AdminDateField label="Reveal at" onChangeText={setRevealAt} value={revealAt} />{error ? <ErrorMessage message={error.message} fieldErrors={error.fieldErrors} /> : null}<Action disabled={saving || !prompt.trim() || !seasonId} onPress={() => void save('publish')}>{saving ? 'Saving…' : 'Save'}</Action><Action disabled={saving || !prompt.trim() || !seasonId} secondary onPress={() => void save('draft')}>Save as draft</Action><Action secondary onPress={() => router.back()}>Cancel</Action></ScrollView><Modal animationType="slide" onRequestClose={() => setSeasonMenuVisible(false)} transparent visible={seasonMenuVisible}><View style={styles.modalRoot}><Pressable accessibilityLabel="Close season selector" onPress={() => setSeasonMenuVisible(false)} style={styles.modalBackdrop} /><View style={styles.seasonSheet}><Text style={styles.sheetTitle}>Choose a season</Text>{seasons.map((season) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: season.id === seasonId }} key={season.id} onPress={() => { setSeasonId(season.id); setSeasonMenuVisible(false); }} style={[styles.seasonOption, season.id === seasonId && styles.seasonOptionSelected]}><View style={styles.seasonOptionCopy}><Text style={styles.seasonOptionText}>{season.name}</Text>{season.active ? <Text style={styles.activeLabel}>Active</Text> : null}</View>{season.id === seasonId ? <Checkmark color={colors.brand} size={22} /> : null}</Pressable>)}</View></View></Modal></KeyboardAvoidingView>;
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
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: Spacing.sm },
  seasonPicker: { marginBottom: Spacing.sm },
  seasonSelector: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 64, paddingHorizontal: Spacing.lg },
  seasonSelectorValue: { color: colors.text, fontSize: 17, fontWeight: '800', maxWidth: 280 },
  activeLabel: { color: colors.brandLight, fontSize: 12, fontWeight: '800', marginTop: 3 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { backgroundColor: 'rgba(0, 0, 0, 0.58)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  seasonSheet: { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.xl },
  sheetTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: Spacing.md },
  seasonOption: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: Spacing.md },
  seasonOptionSelected: { backgroundColor: 'rgba(32, 223, 114, 0.1)' },
  seasonOptionCopy: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  seasonOptionText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  detailsField: { marginBottom: Spacing.lg },
  detailsInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 132, padding: Spacing.md },
  pressed: { opacity: 0.78 },
  muted: { color: colors.textMuted, fontSize: 15, paddingVertical: Spacing.md },
});
