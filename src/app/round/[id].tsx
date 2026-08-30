import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, ErrorMessage } from '@/components/auth-ui';
import { colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { getRoundDetail } from '@/lib/api';
import { ApiError, RevealedSubmission, RoundDetailResponse, RoundSummary, SubmissionTrack } from '@/types';

function formatDate(value: string | null) { return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set'; }
function stateLabel(state: string) { return state.replace('_', ' ').toUpperCase(); }

function Artwork({ track, large = false }: { track: SubmissionTrack; large?: boolean }) {
  return track.album_art_url ? <Image accessibilityLabel={`${track.album} artwork`} source={{ uri: track.album_art_url }} style={large ? styles.winnerArtwork : styles.artwork} /> : <View style={large ? styles.winnerArtwork : styles.artwork}><Text style={styles.artworkFallback}>♫</Text></View>;
}

function RoundHeader({ round, onBack }: { round: RoundSummary; onBack: () => void }) {
  return <View style={styles.header}><Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={10} onPress={onBack} style={styles.back}><Text style={styles.backText}>‹</Text><Text style={styles.backLabel}>Home</Text></Pressable><Text style={styles.state}>{stateLabel(round.state)}</Text></View>;
}

function RoundIntro({ round }: { round: RoundSummary }) {
  return <View style={styles.intro}><Text style={styles.prompt}>{round.prompt}</Text>{round.details ? <Text style={styles.details}>{round.details}</Text> : null}<Text style={styles.season}>{round.season.name}</Text></View>;
}

function UpcomingContent({ round }: { round: RoundSummary }) {
  return <StateCard title="Coming soon" body="Submissions haven’t opened yet."><Text style={styles.info}>Submissions open {formatDate(round.submission_opens)}.</Text></StateCard>;
}

function SubmittingContent({ round, submission }: { round: RoundSummary; submission: SubmissionTrack | null }) {
  return <StateCard title="Submissions are open" body={`Submissions close ${formatDate(round.submission_deadline)}.`}>{submission ? <View style={styles.submission}><Artwork track={submission} /><View style={styles.trackCopy}><Text style={styles.trackEyebrow}>Your submission</Text><Text style={styles.trackTitle}>{submission.title}</Text><Text style={styles.trackArtist}>{submission.artist}</Text></View></View> : <><Text style={styles.info}>Your song stays private until the round is revealed.</Text><Action disabled onPress={() => undefined}>Submission experience coming next</Action></>}</StateCard>;
}

function VotingContent({ round, ballot }: { round: RoundSummary; ballot: RoundDetailResponse['ballot'] }) {
  const eligible = ballot.eligible_submissions ?? [];
  return <StateCard title="Voting is open" body={`Voting closes ${formatDate(round.voting_deadline)}.`}><Text style={styles.info}>{ballot.voted_count} of {ballot.eligible_count} songs rated.</Text>{ballot.complete ? <Text style={styles.success}>Your ballot is complete.</Text> : null}{ballot.no_votable_songs ? <Text style={styles.info}>There are no eligible songs on your ballot.</Text> : null}{eligible.length ? <View style={styles.previewList}>{eligible.map((track) => <View key={track.id} style={styles.previewRow}><Artwork track={track} /><View style={styles.trackCopy}><Text style={styles.trackTitle}>{track.title}</Text><Text style={styles.trackArtist}>{track.artist}</Text></View><Text style={styles.anonymous}>Anonymous</Text></View>)}</View> : null}<Action disabled onPress={() => undefined}>Voting experience coming next</Action></StateCard>;
}

function LockedContent({ round }: { round: RoundSummary }) {
  return <StateCard title="Votes are locked" body="Results are being prepared."><Text style={styles.info}>The reveal begins {formatDate(round.reveal_at)}.</Text></StateCard>;
}

function ResultRow({ result }: { result: RevealedSubmission }) {
  return <View style={[styles.resultRow, result.place === 1 && styles.winnerRow]}><Text style={styles.place}>{result.place_label ?? `#${result.place ?? '—'}`}</Text><Artwork track={result} /><View style={styles.trackCopy}><Text style={styles.trackTitle}>{result.title}</Text><Text style={styles.trackArtist}>{result.artist}</Text><Text style={styles.submitter}>Picked by {result.submitter.display_name}</Text><Text style={styles.score}>{result.average_score.toFixed(2)} ★ · {result.vote_count} votes</Text></View></View>;
}

function RevealedContent({ round, results }: { round: RoundSummary; results: RevealedSubmission[] }) {
  const winner = results.find((result) => result.place === 1);
  return <View style={styles.revealed}><Text style={styles.revealKicker}>ROUND RESULTS</Text>{winner ? <View style={styles.winnerCard}><Text style={styles.winnerLabel}>{winner.tied ? 'TIED WINNER' : 'WINNER'}</Text><Artwork large track={winner} /><Text style={styles.winnerTitle}>{winner.title}</Text><Text style={styles.winnerArtist}>{winner.artist}</Text><Text style={styles.submitter}>Picked by {winner.submitter.display_name}</Text><Text style={styles.score}>{winner.average_score.toFixed(2)} ★ · {winner.vote_count} votes</Text></View> : <Text style={styles.info}>No results are available for this round.</Text>}{results.length > 1 ? <View style={styles.resultsList}>{results.filter((result) => result.id !== winner?.id).map((result) => <ResultRow key={result.id} result={result} />)}</View> : null}{round.playlist_url ? <Action secondary onPress={() => void Linking.openURL(round.playlist_url as string)}>Open round playlist</Action> : null}</View>;
}

function StateCard({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return <View style={styles.stateCard}><Text style={styles.stateTitle}>{title}</Text><Text style={styles.stateBody}>{body}</Text>{children}</View>;
}

export default function RoundDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { refresh: refreshSession } = useAuth();
  const [detail, setDetail] = useState<RoundDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async (pull = false) => {
    const roundId = Number(id);
    if (!Number.isInteger(roundId) || roundId < 1) { setError(ApiError.fromHttpStatus(404, 'This round could not be found.')); setLoading(false); return; }
    if (pull) setRefreshing(true); else setLoading(true);
    setError(null);
    try { setDetail(await getRoundDetail(roundId)); } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Unable to load this round.');
      if (apiError.statusCode === 401) await refreshSession(); else setError(apiError);
    } finally { setLoading(false); setRefreshing(false); }
  }, [id, refreshSession]);

  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);

  if (loading && !detail) return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}><View style={styles.loading}><ActivityIndicator color={colors.brand} /></View></SafeAreaView>;
  if (error && !detail) return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}><View style={styles.errorState}><Text style={styles.errorTitle}>{error.statusCode === 404 ? 'Round not found' : 'Round is unavailable'}</Text><ErrorMessage message={error.isNetworkError ? 'We couldn’t reach QueueUp. Check your connection and try again.' : 'We couldn’t load this round right now.'} /><Action onPress={() => void load()}>Try again</Action><Action secondary onPress={() => router.back()}>Back home</Action></View></SafeAreaView>;
  if (!detail) return null;

  const { round, ballot, my_submission: mySubmission } = detail;
  return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}><RoundHeader onBack={() => router.back()} round={round} /><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl colors={[colors.brand]} onRefresh={() => void load(true)} refreshing={refreshing} tintColor={colors.brand} />}><RoundIntro round={round} />{round.state === 'upcoming' ? <UpcomingContent round={round} /> : null}{round.state === 'submitting' ? <SubmittingContent round={round} submission={mySubmission} /> : null}{round.state === 'voting' ? <VotingContent ballot={ballot} round={round} /> : null}{round.state === 'locked' ? <LockedContent round={round} /> : null}{round.state === 'revealed' ? <RevealedContent results={detail.results ?? []} round={round} /> : null}</ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 }, loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  header: { alignItems: 'center', borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  back: { alignItems: 'center', flexDirection: 'row', minHeight: 44 }, backText: { color: colors.brand, fontSize: 32, lineHeight: 34, marginRight: 4 }, backLabel: { color: colors.text, fontSize: 15, fontWeight: '700' }, state: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  content: { gap: Spacing.lg, padding: Spacing.xl, paddingBottom: Spacing.xxxl }, intro: { gap: Spacing.sm }, prompt: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.7, lineHeight: 38 }, details: { color: colors.textMuted, fontSize: 16, lineHeight: 24 }, season: { color: colors.brandLight, fontSize: 13, fontWeight: '700', marginTop: Spacing.sm },
  stateCard: { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.medium, borderWidth: 1, gap: Spacing.md, padding: Spacing.xl }, stateTitle: { color: colors.text, fontSize: 22, fontWeight: '800' }, stateBody: { color: colors.textMuted, fontSize: 15, lineHeight: 22 }, info: { color: colors.textMuted, fontSize: 14, lineHeight: 21 }, success: { color: colors.brandLight, fontSize: 14, fontWeight: '700' },
  submission: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: Radii.small, flexDirection: 'row', gap: Spacing.md, padding: Spacing.md }, artwork: { backgroundColor: colors.surfaceHighest, borderRadius: 8, height: 56, width: 56 }, artworkFallback: { color: colors.brand, fontSize: 25, marginTop: 12, textAlign: 'center' }, trackCopy: { flex: 1, gap: 2 }, trackEyebrow: { color: colors.brandLight, fontSize: 12, fontWeight: '800' }, trackTitle: { color: colors.text, fontSize: 15, fontWeight: '800' }, trackArtist: { color: colors.textMuted, fontSize: 13 }, anonymous: { color: colors.textMuted, fontSize: 11, fontWeight: '700' }, previewList: { gap: Spacing.sm }, previewRow: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: Radii.small, flexDirection: 'row', gap: Spacing.md, padding: Spacing.sm },
  revealed: { gap: Spacing.md }, revealKicker: { color: colors.brand, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }, winnerCard: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.brand, borderRadius: Radii.large, borderWidth: 1, gap: Spacing.sm, padding: Spacing.xl }, winnerLabel: { color: colors.brand, fontSize: 12, fontWeight: '900', letterSpacing: 1.5 }, winnerArtwork: { backgroundColor: colors.surfaceHighest, borderRadius: Radii.small, height: 180, width: 180 }, winnerTitle: { color: colors.text, fontSize: 24, fontWeight: '900', textAlign: 'center' }, winnerArtist: { color: colors.textMuted, fontSize: 16 }, submitter: { color: colors.textMuted, fontSize: 13 }, score: { color: colors.brandLight, fontSize: 13, fontWeight: '800' }, resultsList: { gap: Spacing.sm }, resultRow: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderRadius: Radii.small, flexDirection: 'row', gap: Spacing.md, padding: Spacing.md }, winnerRow: { borderColor: colors.brand, borderWidth: 1 }, place: { color: colors.brand, fontSize: 13, fontWeight: '900', minWidth: 34 },
  errorState: { flex: 1, justifyContent: 'center', padding: Spacing.xl }, errorTitle: { color: colors.text, fontSize: 24, fontWeight: '800' },
});
