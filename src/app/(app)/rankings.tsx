import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Action, ErrorMessage } from '@/components/auth-ui';
import { PlayerHeader } from '@/components/player-header';
import { defaultSeasonId, SeasonPicker } from '@/components/season-picker';
import { colors, Radii, Spacing } from '@/constants/theme';
import { resolveServerUrl } from '@/config/server';
import { useAuth } from '@/context/auth';
import { getLeaderboard, getProfile } from '@/lib/api';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import { ProfileLink } from '@/components/profile-link';
import { ApiError, LeaderboardEntry, LeaderboardResponse, ProfilePrestigeBadge, SeasonSummary, UserSummary } from '@/types';

function formatSeasonDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Date unavailable';
}

function formatRounds(count: number): string {
  return `${count} ${count === 1 ? 'round' : 'rounds'}`;
}

function Avatar({ player }: { player: UserSummary }) {
  const pictureUrl = resolveServerUrl(player.picture_url);
  const initial = player.display_name.trim().charAt(0).toUpperCase() || '?';

  return <View style={styles.avatar}>
    {pictureUrl ? <Image accessibilityLabel={`${player.display_name} profile picture`} source={{ uri: pictureUrl }} style={styles.avatarImage} /> : <Text style={styles.avatarInitial}>{initial}</Text>}
  </View>;
}

function LeaderboardRow({ entry, currentUserId, badge }: { entry: LeaderboardEntry; currentUserId: number | null; badge?: ProfilePrestigeBadge }) {
  const isCurrentUser = entry.player.id === currentUserId;
  const place = `${entry.tied ? 'T-' : ''}#${entry.place}`;
  const metadata = formatRounds(entry.rounds_played);
  const showBadge = Boolean(badge) && entry.player.username.length <= 18;

  return <View style={[styles.rankRow, isCurrentUser && styles.currentUserRow]}>
    <Text style={[styles.rankPlace, entry.place <= 3 && styles.topRankPlace]}>{place}</Text>
    <Avatar player={entry.player} />
    <View style={styles.playerCopy}>
      <View style={styles.nameLine}><ProfileLink displayName={entry.player.display_name} style={entry.player.display_name.length > 18 ? styles.longPlayerName : styles.playerName} username={entry.player.username} />{showBadge && badge ? <View accessibilityLabel={`${badge.name} badge`} style={styles.badge}><Text style={styles.badgeIcon}>{badge.icon}</Text></View> : null}</View>
      <Text numberOfLines={1} style={styles.playerMeta}>{metadata}</Text>
    </View>
    <Text numberOfLines={1} style={styles.points}>{entry.total_score.toLocaleString()} pts</Text>
  </View>;
}

function EmptyLeaderboard({ season }: { season: SeasonSummary | null }) {
  return <View style={styles.empty}>
    <Text style={styles.emptyTitle}>{season ? 'No scores yet' : 'No seasons yet'}</Text>
    <Text style={styles.emptyCopy}>{season ? 'Standings appear after players receive votes in this season.' : 'Season standings will appear here when a season begins.'}</Text>
  </View>;
}

export default function RankingsScreen() {
  const { user, refresh: refreshSession } = useAuth();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [bestBadges, setBestBadges] = useState<Record<number, ProfilePrestigeBadge>>({});
  const requestInFlight = useRef(false);

  const load = useCallback(async (seasonId?: number, pull = false, background = false) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (pull) setRefreshing(true); else if (!background) setLoading(true);
    setError(null);
    try {
      const next = await getLeaderboard(seasonId);
      setData(next);
      const badgeEntries = await Promise.all(next.leaderboard.map(async (entry) => {
        try {
          const profile = await getProfile(entry.player.username, next.season?.id);
          return profile.prestige_badges[0] ? [entry.player.id, profile.prestige_badges[0]] as const : null;
        } catch {
          return null;
        }
      }));
      setBestBadges(Object.fromEntries(badgeEntries.filter((entry): entry is readonly [number, ProfilePrestigeBadge] => entry !== null)));
      setSelectedSeasonId(next.season?.id ?? defaultSeasonId(next.seasons));
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Unable to load season standings.');
      if (apiError.statusCode === 401) {
        setData(null);
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
  useLiveRefresh(() => load(selectedSeasonId ?? undefined, false, true), null);

  const selectSeason = useCallback((seasonId: number) => {
    setSelectedSeasonId(seasonId);
    void load(seasonId, true);
  }, [load]);

  if (loading && !data) return <View style={styles.screen}><PlayerHeader /><View style={styles.centerState}><ActivityIndicator color={colors.brand} /></View></View>;
  if (error && !data) return <View style={styles.screen}><PlayerHeader /><View style={styles.centerState}><Text style={styles.errorTitle}>Rankings are taking a moment</Text><ErrorMessage message="We couldn’t load season standings right now." /><Action onPress={() => void load()}>Try again</Action></View></View>;

  const seasons = data?.seasons ?? [];
  const selectedSeason = data?.season ?? seasons.find((season) => season.id === selectedSeasonId) ?? null;
  const selectedId = selectedSeasonId ?? selectedSeason?.id ?? seasons[0]?.id ?? null;
  const entries = data?.leaderboard ?? [];

  return <View style={styles.screen}>
    <PlayerHeader />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl colors={[colors.brand]} onRefresh={() => void load(selectedId ?? undefined, true)} refreshing={refreshing} tintColor={colors.brand} />}>
      <View style={styles.intro}>
        <Text style={styles.kicker}>Season standings</Text>
        <Text style={styles.title}>Ranks</Text>
        <Text style={styles.subtitle}>Scores carry across every round in a season.</Text>
      </View>
      {error ? <View style={styles.inlineError}><Text style={styles.inlineErrorText}>Standings may be out of date. Pull to try again.</Text></View> : null}
      {seasons.length && selectedId !== null ? <SeasonPicker onSelect={selectSeason} seasons={seasons} selectedId={selectedId} /> : null}
      {selectedSeason ? <View style={styles.seasonSummary}><Text style={styles.seasonName}>{selectedSeason.name}</Text><Text style={styles.seasonDates}>{formatSeasonDate(selectedSeason.starts_at)} – {formatSeasonDate(selectedSeason.ends_at)}</Text></View> : null}
      {entries.length ? <View style={styles.leaderboard}>{entries.map((entry) => <LeaderboardRow badge={bestBadges[entry.player.id]} currentUserId={user?.id ?? null} entry={entry} key={`${entry.player.id}-${entry.place}`} />)}</View> : <EmptyLeaderboard season={selectedSeason} />}
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
  seasonSummary: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.lg },
  seasonName: { color: colors.text, flex: 1, fontSize: 16, fontWeight: '800' },
  seasonDates: { color: colors.textMuted, flexShrink: 1, fontSize: 12, textAlign: 'right' },
  leaderboard: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: Radii.medium, borderWidth: 1, overflow: 'hidden' },
  rankRow: { alignItems: 'center', borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: Spacing.md, minHeight: 78, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  currentUserRow: { backgroundColor: 'rgba(32, 223, 114, 0.08)', borderLeftColor: colors.brand, borderLeftWidth: 3, paddingLeft: Spacing.md },
  rankPlace: { color: colors.textMuted, fontSize: 16, fontWeight: '900', minWidth: 38 },
  topRankPlace: { color: colors.brandLight },
  avatar: { alignItems: 'center', backgroundColor: colors.surfaceHighest, borderColor: colors.border, borderRadius: 21, borderWidth: 1, height: 42, justifyContent: 'center', overflow: 'hidden', width: 42 },
  avatarImage: { height: '100%', width: '100%' },
  avatarInitial: { color: colors.brandLight, fontSize: 17, fontWeight: '900' },
  playerCopy: { flex: 1, gap: 3, minWidth: 0, overflow: 'hidden' },
  nameLine: { alignItems: 'center', flexDirection: 'row', gap: Spacing.xs, minWidth: 0 },
  playerName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  longPlayerName: { color: colors.text, fontSize: 13, fontWeight: '800' },
  badge: { alignItems: 'center', backgroundColor: 'rgba(32, 223, 114, 0.12)', borderColor: 'rgba(32, 223, 114, 0.28)', borderRadius: 10, borderWidth: 1, height: 24, justifyContent: 'center', width: 24 },
  badgeIcon: { fontSize: 13 },
  playerMeta: { color: colors.textMuted, fontSize: 12 },
  points: { color: colors.text, flexShrink: 0, fontSize: 17, fontWeight: '900', textAlign: 'right' },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: Radii.medium, borderWidth: 1, gap: Spacing.sm, justifyContent: 'center', minHeight: 220, padding: Spacing.xl },
  emptyTitle: { color: colors.text, fontSize: 21, fontWeight: '800' },
  emptyCopy: { color: colors.textMuted, fontSize: 15, lineHeight: 22, maxWidth: 280, textAlign: 'center' },
  inlineError: { backgroundColor: 'rgba(245, 196, 92, 0.1)', borderColor: 'rgba(245, 196, 92, 0.3)', borderRadius: Radii.small, borderWidth: 1, padding: Spacing.md },
  inlineErrorText: { color: colors.warning, fontSize: 14, lineHeight: 20 },
  errorTitle: { color: colors.text, fontSize: 24, fontWeight: '800' },
});
