import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Action, ErrorMessage } from '@/components/auth-ui';
import { PlayerHeader } from '@/components/player-header';
import { ArrowRight } from '@/components/queueup-icon';
import { RecapBanner } from '@/components/recap-banner';
import { defaultSeasonId, SeasonPicker } from '@/components/season-picker';
import { colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { getArchive, getSeasons } from '@/lib/api';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import { ApiError, ArchiveResponse, RoundSummary, SeasonSummary } from '@/types';

function formatRevealDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date unavailable';
}

function ArchiveRoundCard({ round }: { round: RoundSummary }) {
  const router = useRouter();
  return <Pressable accessibilityLabel={`Open ${round.prompt}`} accessibilityRole="button" onPress={() => router.push(`/round/${round.id}` as never)} style={({ pressed }) => [styles.roundCard, pressed && styles.pressed]}>
    <View style={styles.roundTopRow}><Text style={styles.resultsPill}>RESULTS</Text><Text style={styles.revealDate}>{formatRevealDate(round.reveal_at)}</Text></View>
    <Text style={styles.roundPrompt}>{round.prompt}</Text>
    {round.details ? <Text numberOfLines={2} style={styles.roundDetails}>{round.details}</Text> : null}
    <View style={styles.roundFooter}><Text style={styles.roundMeta}>{round.submission_count} {round.submission_count === 1 ? 'song' : 'songs'}</Text><View style={styles.openRound}><Text style={styles.openRoundText}>View round</Text><ArrowRight color={colors.brandLight} size={18} /></View></View>
  </Pressable>;
}

export default function ArchiveScreen() {
  const router = useRouter();
  const { refresh: refreshSession } = useAuth();
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [archive, setArchive] = useState<ArchiveResponse | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
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
      const [seasonData, archiveData] = await Promise.all([getSeasons(), getArchive()]);
      const recapBySeason = new Map((archiveData.seasons ?? []).map((season) => [season.id, season.recap]));
      setSeasons(seasonData.seasons.map((season) => ({ ...season, recap: recapBySeason.get(season.id) })));
      setArchive(archiveData);
      setSelectedSeasonId((current) => seasonData.seasons.some((season) => season.id === current) ? current : defaultSeasonId(seasonData.seasons));
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Unable to load your archive.');
      if (apiError.statusCode === 401) {
        setArchive(null);
        await refreshSession();
      } else {
        setError(apiError);
      }
    } finally {
      requestInFlight.current = false;
      if (!background) setLoading(false);
      setRefreshing(false);
    }
  }, [refreshSession]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useLiveRefresh(() => load(false, true), null);

  const selectSeason = useCallback((seasonId: number) => {
    setSelectedSeasonId(seasonId);
    void load(true);
  }, [load]);

  if (loading && !archive) return <View style={styles.screen}><PlayerHeader /><View style={styles.centerState}><ActivityIndicator color={colors.brand} /></View></View>;
  if (error && !archive) return <View style={styles.screen}><PlayerHeader /><View style={styles.centerState}><Text style={styles.errorTitle}>Archive is taking a moment</Text><ErrorMessage message="We couldn’t load past rounds right now." /><Action onPress={() => void load()}>Try again</Action></View></View>;

  const selectedSeason = seasons.find((season) => season.id === selectedSeasonId);
  const rounds = selectedSeasonId === null ? [] : (archive?.rounds ?? []).filter((round) => round.season.id === selectedSeasonId);

  return <View style={styles.screen}>
    <PlayerHeader />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl colors={[colors.brand]} onRefresh={() => void load(true)} refreshing={refreshing} tintColor={colors.brand} />}>
      <View style={styles.intro}><Text style={styles.kicker}>Past rounds</Text><Text style={styles.title}>Archive</Text><Text style={styles.subtitle}>Revisit every completed prompt and reveal.</Text></View>
      {error ? <View style={styles.inlineError}><Text style={styles.inlineErrorText}>Some archive updates may be unavailable. Pull to try again.</Text></View> : null}
      {seasons.length ? <SeasonPicker onSelect={selectSeason} seasons={seasons} selectedId={selectedSeasonId ?? seasons[0].id} /> : null}
      {!seasons.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>No seasons yet</Text><Text style={styles.emptyCopy}>Completed rounds will appear here when a season begins.</Text></View> : null}
      {selectedSeason && !rounds.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>No completed rounds yet</Text><Text style={styles.emptyCopy}>The current round will appear here after it is revealed.</Text></View> : null}
      {selectedSeason?.recap?.available ? <RecapBanner onPress={() => router.push(`/season/${selectedSeason.id}/recap` as never)} season={selectedSeason} /> : null}
      {rounds.length ? <View style={styles.roundList}>{rounds.map((round) => <ArchiveRoundCard key={round.id} round={round} />)}</View> : null}
      {selectedSeason ? <Text style={styles.seasonNote}>{selectedSeason.name}</Text> : null}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { alignSelf: 'center', flexGrow: 1, gap: Spacing.lg, maxWidth: 800, padding: Spacing.xl, paddingBottom: Spacing.xxxl, width: '100%' },
  centerState: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  intro: { gap: Spacing.sm, marginTop: Spacing.sm },
  kicker: { color: colors.brandLight, fontSize: 12, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 36, fontWeight: '900', letterSpacing: -1.1, lineHeight: 42 },
  subtitle: { color: colors.textMuted, fontSize: 16, lineHeight: 24 },
  roundList: { gap: Spacing.md },
  roundCard: { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSoft, borderRadius: Radii.medium, borderWidth: 1, gap: Spacing.md, padding: Spacing.lg },
  roundTopRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  resultsPill: { backgroundColor: 'rgba(32, 223, 114, 0.1)', borderRadius: 999, color: colors.brandLight, fontSize: 10, fontWeight: '900', letterSpacing: 1, overflow: 'hidden', paddingHorizontal: Spacing.sm, paddingVertical: 5 },
  revealDate: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  roundPrompt: { color: colors.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.35, lineHeight: 27 },
  roundDetails: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  roundFooter: { alignItems: 'center', borderTopColor: colors.borderSoft, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.md },
  roundMeta: { color: colors.textMuted, fontSize: 13 },
  openRound: { alignItems: 'center', flexDirection: 'row', gap: Spacing.xs },
  openRoundText: { color: colors.brandLight, fontSize: 14, fontWeight: '800' },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: Radii.medium, borderWidth: 1, gap: Spacing.sm, justifyContent: 'center', minHeight: 220, padding: Spacing.xl },
  emptyTitle: { color: colors.text, fontSize: 21, fontWeight: '800' },
  emptyCopy: { color: colors.textMuted, fontSize: 15, lineHeight: 22, maxWidth: 280, textAlign: 'center' },
  inlineError: { backgroundColor: 'rgba(245, 196, 92, 0.1)', borderColor: 'rgba(245, 196, 92, 0.3)', borderRadius: Radii.small, borderWidth: 1, padding: Spacing.md },
  inlineErrorText: { color: colors.warning, fontSize: 14, lineHeight: 20 },
  errorTitle: { color: colors.text, fontSize: 24, fontWeight: '800' },
  seasonNote: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  pressed: { opacity: 0.76 },
});
