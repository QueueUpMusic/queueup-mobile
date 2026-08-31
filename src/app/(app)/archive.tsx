import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Action, ErrorMessage } from '@/components/auth-ui';
import { PlayerHeader } from '@/components/player-header';
import { ArrowRight, Checkmark, ChevronDown } from '@/components/queueup-icon';
import { colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { getArchive, getSeasons } from '@/lib/api';
import { ApiError, ArchiveResponse, RoundSummary, SeasonSummary } from '@/types';

function formatRevealDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date unavailable';
}

function defaultSeasonId(seasons: SeasonSummary[]) {
  return seasons.find((season) => season.active)?.id ?? seasons[0]?.id ?? null;
}

function SeasonPicker({ seasons, selectedId, onSelect }: { seasons: SeasonSummary[]; selectedId: number; onSelect: (seasonId: number) => void }) {
  const [visible, setVisible] = useState(false);
  const selected = seasons.find((season) => season.id === selectedId);

  return <>
    <Pressable accessibilityHint="Opens the season list" accessibilityLabel="Choose season" accessibilityRole="button" onPress={() => setVisible(true)} style={({ pressed }) => [styles.selector, pressed && styles.pressed]}>
      <View><Text style={styles.selectorLabel}>Season</Text><Text numberOfLines={1} style={styles.selectorValue}>{selected?.name ?? 'Choose a season'}</Text></View>
      <ChevronDown color={colors.brand} size={21} />
    </Pressable>
    <Modal animationType="slide" onRequestClose={() => setVisible(false)} presentationStyle="overFullScreen" transparent visible={visible}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityLabel="Close season selector" onPress={() => setVisible(false)} style={styles.modalBackdrop} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Choose a season</Text><Pressable accessibilityLabel="Close season selector" accessibilityRole="button" onPress={() => setVisible(false)} style={styles.sheetClose}><Text style={styles.sheetCloseText}>×</Text></Pressable></View>
          <ScrollView contentContainerStyle={styles.sheetList}>
            {seasons.map((season) => <Pressable accessibilityRole="button" key={season.id} onPress={() => { setVisible(false); onSelect(season.id); }} style={({ pressed }) => [styles.seasonOption, season.id === selectedId && styles.selectedSeasonOption, pressed && styles.pressed]}>
              <View style={styles.seasonOptionCopy}><Text style={styles.seasonOptionName}>{season.name}</Text>{season.active ? <Text style={styles.activeLabel}>Active</Text> : null}</View>
              {season.id === selectedId ? <Checkmark color={colors.brand} size={22} /> : null}
            </Pressable>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
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
  const { refresh: refreshSession } = useAuth();
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [archive, setArchive] = useState<ArchiveResponse | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const requestInFlight = useRef(false);

  const load = useCallback(async (pull = false) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (pull) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [seasonData, archiveData] = await Promise.all([getSeasons(), getArchive()]);
      setSeasons(seasonData.seasons);
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
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshSession]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

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
      {selectedSeason && !rounds.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>No rounds yet</Text><Text style={styles.emptyCopy}>Revealed rounds from this season will appear here.</Text></View> : null}
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
  selector: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.medium, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 72, paddingHorizontal: Spacing.lg },
  selectorLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase' },
  selectorValue: { color: colors.text, fontSize: 17, fontWeight: '800', maxWidth: 280 },
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
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { backgroundColor: 'rgba(0, 0, 0, 0.58)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  sheet: { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderTopLeftRadius: Radii.large, borderTopRightRadius: Radii.large, borderWidth: 1, maxHeight: '70%', paddingBottom: Spacing.xl },
  sheetHeader: { alignItems: 'center', borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  sheetTitle: { color: colors.text, fontSize: 19, fontWeight: '800' },
  sheetClose: { alignItems: 'center', backgroundColor: colors.surfaceHighest, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  sheetCloseText: { color: colors.text, fontSize: 26, lineHeight: 30 },
  sheetList: { gap: Spacing.xs, padding: Spacing.md },
  seasonOption: { alignItems: 'center', borderRadius: Radii.small, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: Spacing.md },
  selectedSeasonOption: { backgroundColor: 'rgba(32, 223, 114, 0.1)' },
  seasonOptionCopy: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: Spacing.sm },
  seasonOptionName: { color: colors.text, flexShrink: 1, fontSize: 16, fontWeight: '700' },
  activeLabel: { color: colors.brandLight, fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.76 },
});
