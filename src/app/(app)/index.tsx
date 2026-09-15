import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Action, ErrorMessage } from '@/components/auth-ui';
import { PlayerHeader } from '@/components/player-header';
import { ArrowRight, Checkmark } from '@/components/queueup-icon';
import { RecapBanner } from '@/components/recap-banner';
import { HomepageCountdowns } from '@/components/homepage-countdown';
import { resolveServerUrl } from '@/config/server';
import { colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { getArchive, getDashboard, getRoundDetail } from '@/lib/api';
import { ApiError, DashboardResponse, RoundSummary, SeasonSummary, SubmissionTrack } from '@/types';
import { useLiveRefresh } from '@/hooks/use-live-refresh';

function formatDate(value: string | null) {
  if (!value) return 'Not set';
  const date = new Date(value);
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`;
}

function formatCountdown(target: string | null, now: number) {
  if (!target) return '—';
  const seconds = Math.floor(Math.max(0, new Date(target).getTime() - now) / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds % 60).padStart(2, '0')}s`;
}

function roundStateLabel(round: RoundSummary, isResults: boolean) {
  return isResults ? 'RESULTS' : round.state.replace('_', ' ').toUpperCase();
}

function primaryLabel(round: RoundSummary, isResults: boolean, ballotComplete: boolean) {
  if (isResults || round.state === 'revealed') return 'See the results';
  if (round.state === 'submitting') return 'Choose your song';
  if (round.state === 'voting') return ballotComplete ? 'Review your ratings' : 'Start voting';
  return null;
}

function CountdownPanel({ round, isResults }: { round: RoundSummary; isResults: boolean }) {
  const target = isResults ? null : round.state === 'upcoming' ? round.submission_opens : round.state === 'submitting' ? round.submission_deadline : round.state === 'voting' ? round.voting_deadline : round.state === 'locked' ? round.reveal_at : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);

  const label = isResults ? 'Round revealed' : round.state === 'upcoming' ? 'Submissions open in' : round.state === 'submitting' ? 'Submissions close in' : round.state === 'voting' ? 'Voting closes in' : round.state === 'locked' ? 'Reveal begins in' : 'Revealed';
  return <View style={styles.countdownPanel}><Text numberOfLines={2} style={styles.countdownLabel}>{label}</Text><Text numberOfLines={isResults ? 2 : 1} style={[styles.countdownValue, isResults && styles.revealedDate]}>{isResults ? formatDate(round.reveal_at) : formatCountdown(target, now)}</Text></View>;
}

function SubmissionStatus({ submission }: { submission: SubmissionTrack }) {
  return <View style={styles.submitted}><View style={styles.submissionArtwork}>{submission.album_art_url ? <Image accessibilityLabel={`${submission.album} artwork`} source={{ uri: submission.album_art_url }} style={styles.submissionImage} /> : <Text style={styles.artworkFallback}>♫</Text>}</View><View style={styles.submissionCopy}><Text style={styles.submissionTitle}>Song locked in</Text><Text style={styles.submissionText}>{submission.title} · {submission.artist}</Text><Text style={styles.submissionText}>Your pick stays secret until reveal.</Text></View><View style={styles.check}><Checkmark color={colors.background} size={19} /></View></View>;
}

function HostCard({ host }: { host: NonNullable<RoundSummary['host']> }) {
  const pictureUrl = resolveServerUrl(host.picture_url);
  const initial = host.display_name.trim().charAt(0).toUpperCase() || '?';

  return <View style={[styles.metric, styles.hostCard]}>
    <View style={styles.hostAvatar}>
      {pictureUrl ? <Image accessibilityLabel={`${host.display_name}'s profile picture`} source={{ uri: pictureUrl }} style={styles.hostImage} /> : <Text style={styles.hostInitial}>{initial}</Text>}
    </View>
    <Text numberOfLines={2} style={styles.hostName}>{host.display_name}</Text>
    <Text style={styles.metricLabel}>Host</Text>
  </View>;
}

function RoundCard({ round, submission, isResults = false, ballotComplete = false }: { round: RoundSummary; submission: DashboardResponse['my_submission']; isResults?: boolean; ballotComplete?: boolean }) {
  const router = useRouter();
  const primary = submission && round.state === 'submitting'
    ? null
    : primaryLabel(round, isResults, ballotComplete);
  const isLocked = round.state === 'locked';

  return <Pressable accessibilityLabel={`Open round: ${round.prompt}`} accessibilityRole="button" onPress={() => router.push(`/round/${round.id}` as never)} style={({ pressed }) => [styles.card, pressed && styles.pressedCard]}>
    <View style={styles.eyebrow}>
      <Text style={styles.seasonPill}>{round.season.name}</Text>
      <Text style={[styles.statePill, isLocked && styles.lockedPill]}>{roundStateLabel(round, isResults)}</Text>
    </View>

    <View style={styles.headingGroup}>
      <Text style={styles.prompt}>{round.prompt}</Text>
      {round.details ? <Text style={styles.body}>{round.details}</Text> : null}
    </View>

    <CountdownPanel isResults={isResults} round={round} />

    <View style={styles.statsRow}>
      <View style={styles.metric}><Text style={styles.metricValue}>{round.submission_count}</Text><Text style={styles.metricLabel}>Songs</Text></View>
      <View style={styles.metric}><Text style={styles.metricValue}>{round.rating_count}</Text><Text style={styles.metricLabel}>Ratings</Text></View>
      {round.host ? <HostCard host={round.host} /> : null}
    </View>

    {submission && !isResults ? <SubmissionStatus submission={submission} /> : null}

    {primary ? <Pressable accessibilityLabel={primary} accessibilityRole="button" onPress={(event) => { event.stopPropagation(); router.push((round.state === 'submitting' ? `/round/${round.id}/submit` : round.state === 'voting' ? `/round/${round.id}/vote` : `/round/${round.id}`) as never); }} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressedCard]}><Text style={styles.primaryButtonText}>{primary}</Text><ArrowRight color={colors.background} size={19} /></Pressable> : null}

    <View style={styles.secondaryRow}>
      <View style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Round details</Text></View>
    </View>
  </Pressable>;
}

export default function HomeScreen() {
  const router = useRouter();
  const { refresh: refreshSession } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [unseenRecap, setUnseenRecap] = useState<SeasonSummary | null>(null);
  const [currentBallotComplete, setCurrentBallotComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const requestInFlight = useRef(false);

  const load = useCallback(async (pull = false, background = false) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (pull) setRefreshing(true); else if (!background) setLoading(true);
    setError(null);
    try {
      const dashboardResult = await getDashboard();
      setDashboard(dashboardResult);
      if (dashboardResult.current_round?.state === 'voting') {
        try {
          const roundDetail = await getRoundDetail(dashboardResult.current_round.id);
          setCurrentBallotComplete(roundDetail.ballot.complete);
        } catch {
          setCurrentBallotComplete(false);
        }
      } else {
        setCurrentBallotComplete(false);
      }
      try {
        const archive = await getArchive();
        const recapSeason = (archive.seasons ?? []).find((season) => season.recap.available && !season.recap.viewed);
        setUnseenRecap(recapSeason ?? null);
      } catch {
        // Archive recap metadata is additive; an older server should not break Home.
        setUnseenRecap(null);
      }
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Unable to load your QueueUp home.');
      if (apiError.statusCode === 401) await refreshSession();
      else setError(apiError);
    } finally {
      requestInFlight.current = false;
    if (!background) setLoading(false);
      setRefreshing(false);
    }
  }, [refreshSession]);

  useLiveRefresh(() => load(false, true), 20000);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading && !dashboard) return <View style={styles.screen}><PlayerHeader /><View style={styles.centerState}><ActivityIndicator color={colors.brand} /></View></View>;
  if (error && !dashboard) return <View style={styles.screen}><PlayerHeader /><View style={styles.centerState}><Text style={styles.title}>Home is taking a moment</Text><ErrorMessage message="We couldn’t load your latest QueueUp updates." /><Action onPress={() => void load()}>Try again</Action></View></View>;

  const current = dashboard?.current_round;
  const results = dashboard?.results_round;
  return <View style={styles.screen}><PlayerHeader /><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl colors={[colors.brand]} onRefresh={() => void load(true)} refreshing={refreshing} tintColor={colors.brand} />} style={styles.scroll}>{error ? <Text style={styles.muted}>Some updates may be unavailable. Pull to try again.</Text> : null}{dashboard?.countdowns?.length ? <HomepageCountdowns countdowns={dashboard.countdowns} onReachedZero={() => void load(false, true)} /> : null}{unseenRecap ? <RecapBanner onPress={() => router.push(`/season/${unseenRecap.id}/recap` as never)} season={unseenRecap} /> : null}{current ? <><Text style={styles.section}>Current round</Text><RoundCard ballotComplete={currentBallotComplete} round={current} submission={dashboard?.my_submission ?? null} /></> : null}{results ? <><Text style={styles.section}>Recent results</Text><RoundCard isResults round={results} submission={null} /></> : null}{!current && !results ? <View style={styles.empty}><Text style={styles.title}>No round yet</Text><Text style={styles.body}>There isn’t a current or recently revealed round to show.</Text></View> : null}</ScrollView></View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  scroll: { flex: 1 },
  content: { alignSelf: 'center', flexGrow: 1, gap: Spacing.md, maxWidth: 800, padding: Spacing.lg, paddingBottom: 40, width: '100%' },
  centerState: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  section: { color: colors.textMuted, fontSize: 14, fontWeight: '700', letterSpacing: 1, marginTop: Spacing.lg, textTransform: 'uppercase' },
  card: { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSoft, borderRadius: Radii.large, borderWidth: 1, gap: Spacing.lg, overflow: 'hidden', padding: Spacing.lg },
  pressedCard: { opacity: 0.85 },
  eyebrow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  seasonPill: { backgroundColor: 'rgba(32, 223, 114, 0.1)', borderColor: 'rgba(32, 223, 114, 0.24)', borderRadius: 999, borderWidth: 1, color: colors.brandLight, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, maxWidth: '62%', overflow: 'hidden', paddingHorizontal: Spacing.sm, paddingVertical: 6, textTransform: 'uppercase' },
  statePill: { backgroundColor: 'rgba(32, 223, 114, 0.1)', borderRadius: 999, color: colors.brandLight, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, overflow: 'hidden', paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  lockedPill: { backgroundColor: colors.surfaceHighest, color: colors.textMuted },
  headingGroup: { gap: Spacing.sm },
  prompt: { color: colors.text, fontSize: 31, fontWeight: '900', letterSpacing: -1.1, lineHeight: 35 },
  body: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  countdownPanel: { alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderColor: colors.borderSoft, borderRadius: Radii.medium, borderWidth: 1, flexDirection: 'row', gap: Spacing.sm, justifyContent: 'space-between', minHeight: 76, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  countdownLabel: { color: colors.textMuted, flex: 1, fontSize: 13, lineHeight: 18 },
  countdownValue: { color: colors.text, flexShrink: 1, fontSize: 18, fontVariant: ['tabular-nums'], fontWeight: '900', letterSpacing: -0.4, textAlign: 'right' },
  revealedDate: { fontSize: 15, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  metric: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: colors.borderSoft, borderRadius: Radii.medium, borderWidth: 1, flex: 1, minHeight: 84, padding: Spacing.sm },
  metricValue: { color: colors.text, fontSize: 23, fontWeight: '800' },
  metricLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  hostCard: { minWidth: 0, paddingBottom: Spacing.sm },
  hostAvatar: { alignItems: 'center', backgroundColor: colors.surfaceHighest, borderRadius: 8, height: 30, justifyContent: 'center', overflow: 'hidden', width: 30 },
  hostImage: { height: 30, width: 30 },
  hostInitial: { color: colors.brandLight, fontSize: 14, fontWeight: '800' },
  hostName: { color: colors.text, fontSize: 11, fontWeight: '800', marginTop: 3 },
  submitted: { alignItems: 'center', backgroundColor: 'rgba(32, 223, 114, 0.08)', borderColor: 'rgba(32, 223, 114, 0.2)', borderRadius: Radii.medium, borderWidth: 1, flexDirection: 'row', gap: Spacing.md, padding: Spacing.md },
  submissionArtwork: { alignItems: 'center', backgroundColor: colors.surfaceHighest, borderRadius: Radii.small, height: 54, justifyContent: 'center', overflow: 'hidden', width: 54 },
  submissionImage: { height: 54, width: 54 },
  artworkFallback: { color: colors.brand, fontSize: 24 },
  submissionCopy: { flex: 1, gap: 2 },
  submissionTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  submissionText: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  check: { alignItems: 'center', backgroundColor: colors.brand, borderRadius: 18, color: colors.background, fontSize: 18, fontWeight: '900', height: 34, justifyContent: 'center', overflow: 'hidden', textAlign: 'center', width: 34 },
  primaryButton: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.brand, borderRadius: 14, flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center', minHeight: 46, paddingHorizontal: Spacing.lg },
  primaryButtonText: { color: colors.background, fontSize: 15, fontWeight: '900' },
  secondaryRow: { flexDirection: 'row', gap: Spacing.sm },
  secondaryButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: Radii.small, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: Spacing.sm },
  secondaryButtonText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  muted: { color: colors.textMuted, fontSize: 14 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: Spacing.xxl },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 360, padding: Spacing.xxl },
});
