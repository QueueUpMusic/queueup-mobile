import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, ErrorMessage } from '@/components/auth-ui';
import { ChevronLeft, StarIcon } from '@/components/queueup-icon';
import { colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { SpotifyEmbed } from '@/components/spotify-preview-modal';
import { getRoundDetail, saveVote } from '@/lib/api';
import { ApiError, RoundDetailResponse } from '@/types';

function Header({ onBack }: { onBack: () => void }) {
  return <View style={styles.header}><Pressable accessibilityLabel="Go to home" accessibilityRole="button" hitSlop={8} onPress={onBack} style={styles.back}><ChevronLeft color={colors.brand} size={24} /><Text style={styles.backLabel}>Home</Text></Pressable><Text style={styles.headerTitle}>Rate songs</Text><View style={styles.headerSpacer} /></View>;
}

function LockedState({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  return <View style={styles.center}><Text style={styles.lockedTitle}>{title}</Text><Text style={styles.body}>{body}</Text>{onRetry ? <Action onPress={onRetry}>Try again</Action> : null}</View>;
}

export default function VoteScreen() {
  const { id, review } = useLocalSearchParams<{ id: string; review?: string }>();
  const router = useRouter();
  const { refresh: refreshSession } = useAuth();
  const [detail, setDetail] = useState<RoundDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState({ voted: 0, total: 0, complete: false });
  const [saving, setSaving] = useState(false);
  const [closed, setClosed] = useState(false);
  const load = useCallback(async () => {
    const roundId = Number(id);
    if (!Number.isInteger(roundId) || roundId < 1) { setError(ApiError.fromHttpStatus(404, 'This round could not be found.')); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const next = await getRoundDetail(roundId);
      setDetail(next);
      setScores(next.ballot.saved_scores);
      setProgress({ voted: next.ballot.voted_count, total: next.ballot.eligible_count, complete: next.ballot.complete });
      setClosed(next.round.state !== 'voting');
      if (next.ballot.complete && review !== '1') router.replace(`/round/${roundId}/vote/complete` as never);
      setIndex((current) => Math.min(current, Math.max(0, (next.ballot.eligible_submissions?.length ?? 1) - 1)));
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Unable to load your ballot.');
      if (apiError.statusCode === 401) await refreshSession(); else setError(apiError);
    } finally { setLoading(false); }
  }, [id, refreshSession, review, router]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const tracks = detail?.ballot.eligible_submissions ?? [];
  const current = tracks[index] ?? null;
  const currentScore = current ? scores[String(current.id)] : undefined;
  const isVoting = detail?.round.state === 'voting' && !closed;
  const displayProgress = useMemo(() => `${progress.voted} of ${progress.total} rated`, [progress]);

  const rate = async (score: number) => {
    if (!current || saving || !isVoting) return;
    setSaving(true); setError(null);
    try {
      const result = await saveVote(Number(id), current.id, score);
      setScores(result.ballot.saved_scores);
      setProgress({ voted: result.ballot.voted_count, total: result.ballot.eligible_count, complete: result.ballot.complete });
      if (result.ballot.complete) router.replace(`/round/${id}/vote/complete` as never);
      else if (index < tracks.length - 1) setIndex((value) => value + 1);
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Your rating could not be saved.');
      if (apiError.statusCode === 401) await refreshSession();
      if (apiError.code === 'voting_closed') { setClosed(true); await load(); }
      setError(apiError);
    } finally { setSaving(false); }
  };

  if (loading && !detail) return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}><Header onBack={() => router.replace('/(app)' as never)} /><View style={styles.center}><ActivityIndicator color={colors.brand} /></View></SafeAreaView>;
  if (error && !detail) return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}><Header onBack={() => router.replace('/(app)' as never)} /><LockedState title="Voting unavailable" body={error.isNetworkError ? 'We couldn’t reach QueueUp. Check your connection and try again.' : error.message} onRetry={() => void load()} /></SafeAreaView>;
  if (!detail) return null;
  if (!isVoting) return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}><Header onBack={() => router.replace('/(app)' as never)} /><LockedState title={detail.round.state === 'locked' ? 'Votes are locked' : 'Voting is closed'} body={detail.round.state === 'locked' ? 'Results are being prepared for this round.' : 'QueueUp is no longer accepting ratings for this round.'} /></SafeAreaView>;
  if (!tracks.length || detail.ballot.no_votable_songs) return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}><Header onBack={() => router.replace('/(app)' as never)} /><LockedState title="Nothing to rate" body="There are no eligible songs on your ballot." /></SafeAreaView>;

  return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}><Header onBack={() => router.replace('/(app)' as never)} /><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><View style={styles.context}><Text style={styles.eyebrow}>{detail.round.season.name}</Text><Text style={styles.prompt}>{detail.round.prompt}</Text>{detail.round.details ? <Text style={styles.body}>{detail.round.details}</Text> : null}</View><View style={styles.progressRow}><Text style={styles.progress}>{displayProgress}</Text><Text style={styles.songNumber}>Song {index + 1} of {tracks.length}</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress.total ? (progress.voted / progress.total) * 100 : 0}%` }]} /></View><View style={styles.card}><Text style={styles.anonymous}>ANONYMOUS SONG</Text><SpotifyEmbed trackId={current.spotify_track_id} /><Text style={styles.ratePrompt}>How well does this fit the prompt?</Text><View accessibilityLabel="Song rating" accessibilityRole="radiogroup" style={styles.stars}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} accessibilityLabel={`Rate ${value} out of 5`} accessibilityRole="radio" accessibilityState={{ selected: currentScore === value, disabled: saving }} disabled={saving} onPress={() => void rate(value)} style={({ pressed }) => [styles.starButton, pressed && styles.pressed]}><StarIcon color={currentScore !== undefined && value <= currentScore ? colors.brand : colors.textMuted} filled={currentScore !== undefined && value <= currentScore} size={32} /></Pressable>)}</View><Text accessibilityLiveRegion="polite" style={styles.selectedRating}>{currentScore ? `Your rating: ${currentScore} out of 5` : 'Choose a rating to save and continue.'}</Text>{saving ? <Text style={styles.saving}>Saving rating…</Text> : null}{error ? <ErrorMessage message={error.message} /> : null}</View><Text style={styles.rule}>Rate every song for your ballot to count.</Text><View style={styles.navigation}><Action disabled={index === 0 || saving} secondary onPress={() => setIndex((value) => value - 1)}>Previous</Action><Action disabled={!currentScore || saving || index === tracks.length - 1} onPress={() => setIndex((value) => value + 1)}>Next</Action></View></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'center', borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: Spacing.lg }, back: { alignItems: 'center', flexDirection: 'row', gap: Spacing.xs, minHeight: 44, minWidth: 84 }, backLabel: { color: colors.brandLight, fontSize: 15, fontWeight: '700' }, headerTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, headerSpacer: { minWidth: 84 }, content: { alignSelf: 'center', gap: Spacing.md, maxWidth: 560, padding: Spacing.lg, paddingBottom: Spacing.xxxl, width: '100%' }, context: { gap: Spacing.sm, paddingVertical: Spacing.sm }, eyebrow: { color: colors.brandLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' }, prompt: { color: colors.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.7, lineHeight: 32 }, body: { color: colors.textMuted, fontSize: 15, lineHeight: 22 }, center: { flex: 1, gap: Spacing.md, justifyContent: 'center', padding: Spacing.xl }, lockedTitle: { color: colors.text, fontSize: 24, fontWeight: '900' }, progressRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, progress: { color: colors.brandLight, fontSize: 14, fontWeight: '800' }, songNumber: { color: colors.textMuted, fontSize: 13 }, progressTrack: { backgroundColor: colors.surfaceHighest, borderRadius: 99, height: 6, overflow: 'hidden' }, progressFill: { backgroundColor: colors.brand, borderRadius: 99, height: 6 }, card: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.large, borderWidth: 1, gap: Spacing.sm, padding: Spacing.lg }, anonymous: { color: colors.brandLight, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 }, ratePrompt: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: Spacing.sm }, stars: { flexDirection: 'row', justifyContent: 'center', marginHorizontal: -Spacing.xs }, starButton: { alignItems: 'center', justifyContent: 'center', minHeight: 52, minWidth: 52, padding: Spacing.xs }, selectedRating: { color: colors.textMuted, fontSize: 13, minHeight: 20, textAlign: 'center' }, saving: { color: colors.brandLight, fontSize: 12, fontWeight: '700' }, rule: { color: colors.textMuted, fontSize: 13, textAlign: 'center' }, navigation: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' }, complete: { backgroundColor: 'rgba(32, 223, 114, 0.08)', borderColor: 'rgba(32, 223, 114, 0.25)', borderRadius: Radii.medium, borderWidth: 1, gap: Spacing.sm, padding: Spacing.lg }, completeTitle: { color: colors.brandLight, fontSize: 20, fontWeight: '900' }, pressed: { opacity: 0.72 },
});
