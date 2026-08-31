import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Action, ErrorMessage } from '@/components/auth-ui';
import { PlayerAvatar } from '@/components/player-avatar';
import { PlayerHeader } from '@/components/player-header';
import { ArrowRight, ChevronLeft } from '@/components/queueup-icon';
import { colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { getProfile } from '@/lib/api';
import { ApiError, ProfileBadge, ProfileResponse } from '@/types';

function formatAverage(value: number): string { return value.toFixed(2); }

function ProfileMetric({ label, value }: { label: string; value: string | number }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function BadgeCard({ badge }: { badge: ProfileBadge }) {
  return <View style={[styles.badge, !badge.earned && styles.lockedBadge]}>
    <Text style={styles.badgeIcon}>{badge.icon}</Text>
    <Text numberOfLines={2} style={styles.badgeName}>{badge.name}</Text>
    <Text numberOfLines={3} style={styles.badgeDescription}>{badge.description}</Text>
  </View>;
}

function HistoryRow({ title, artist, score, artwork }: { title: string; artist: string; score: number; artwork: string | null }) {
  return <View style={styles.historyRow}>
    {artwork ? <Image accessibilityLabel={`${title} artwork`} source={{ uri: artwork }} style={styles.historyArtwork} /> : <View style={[styles.historyArtwork, styles.artworkFallback]}><Text style={styles.fallbackMusic}>♫</Text></View>}
    <View style={styles.historyCopy}><Text numberOfLines={1} style={styles.historyTitle}>{title}</Text><Text numberOfLines={1} style={styles.historyArtist}>{artist}</Text></View>
    <Text style={styles.historyScore}>{score.toFixed(2)} ★</Text>
  </View>;
}

function AnalyticsList({ title, values }: { title: string; values: [string, number][] }) {
  if (!values.length) return null;
  return <View style={styles.analyticsCard}><Text style={styles.sectionTitle}>{title}</Text>{values.slice(0, 5).map(([name, count]) => <View key={name} style={styles.analyticsRow}><Text numberOfLines={1} style={styles.analyticsName}>{name}</Text><Text style={styles.analyticsCount}>{count}</Text></View>)}</View>;
}

function ProfileHeader({ onBack }: { onBack: () => void }) {
  return <PlayerHeader leftAction={<Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={8} onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><ChevronLeft color={colors.brand} size={24} /></Pressable>} showAvatar={false} />;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, refresh: refreshSession } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async (pull = false) => {
    if (!user) return;
    if (pull) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      setProfile(await getProfile(user.username));
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Unable to load your profile.');
      if (apiError.statusCode === 401) {
        setProfile(null);
        await refreshSession();
      } else setError(apiError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshSession, user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading && !profile) return <View style={styles.screen}><ProfileHeader onBack={() => router.back()} /><View style={styles.centerState}><ActivityIndicator color={colors.brand} /></View></View>;
  if (error && !profile) return <View style={styles.screen}><ProfileHeader onBack={() => router.back()} /><View style={styles.centerState}><Text style={styles.errorTitle}>Profile is taking a moment</Text><ErrorMessage message="We couldn’t load your profile right now." /><Action onPress={() => void load()}>Try again</Action></View></View>;

  const player = profile?.player;
  const metrics = profile?.metrics;
  if (!player || !metrics) return <View style={styles.screen}><ProfileHeader onBack={() => router.back()} /><View style={styles.centerState}><Text style={styles.errorTitle}>Profile unavailable</Text><Action onPress={() => void load()}>Try again</Action></View></View>;

  return <View style={styles.screen}>
    <ProfileHeader onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl colors={[colors.brand]} onRefresh={() => void load(true)} refreshing={refreshing} tintColor={colors.brand} />}>
      {error ? <View style={styles.inlineError}><Text style={styles.inlineErrorText}>Some profile updates may be unavailable. Pull to try again.</Text></View> : null}
      <View style={styles.hero}>
        <PlayerAvatar size={96} user={player} />
        <Text style={styles.displayName}>{player.display_name}</Text>
        <Text style={styles.username}>@{player.username}</Text>
      </View>

      <View style={styles.metricGrid}>
        <ProfileMetric label="Wins" value={metrics.wins} />
        <ProfileMetric label="Podiums" value={metrics.podiums} />
        <ProfileMetric label="Avg score" value={formatAverage(metrics.average_received)} />
        <ProfileMetric label="Win rate" value={`${metrics.win_rate.toFixed(0)}%`} />
        <ProfileMetric label="Avg place" value={metrics.average_placement ? metrics.average_placement.toFixed(1) : '—'} />
        <ProfileMetric label="Rounds" value={metrics.round_count} />
      </View>

      <Pressable accessibilityHint="Opens account and app settings" accessibilityRole="button" onPress={() => router.push('/settings')} style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}>
        <View><Text style={styles.settingsTitle}>Settings</Text><Text style={styles.settingsCopy}>Account and app preferences</Text></View><ArrowRight color={colors.brandLight} size={20} />
      </Pressable>

      <View><Text style={styles.sectionTitle}>Badges</Text>{profile.badges.length ? <View style={styles.badgeGrid}>{profile.badges.map((badge) => <BadgeCard badge={badge} key={badge.key} />)}</View> : <Text style={styles.emptyCopy}>Achievements will appear here as you play.</Text>}</View>

      <View><Text style={styles.sectionTitle}>Submission history</Text>{profile.history.length ? <View style={styles.historyList}>{profile.history.map((submission) => <HistoryRow artist={submission.artist} artwork={submission.album_art_url} key={submission.id} score={submission.average_score} title={submission.title} />)}</View> : <Text style={styles.emptyCopy}>No revealed submissions yet.</Text>}</View>

      <View style={styles.analyticsGrid}><AnalyticsList title="Favorite genres" values={profile.favorite_genres} /><AnalyticsList title="Most submitted artists" values={profile.most_submitted_artists} /></View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { alignSelf: 'center', gap: Spacing.xl, maxWidth: 800, padding: Spacing.xl, paddingBottom: Spacing.xxxl, width: '100%' },
  centerState: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  hero: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  displayName: { color: colors.text, fontSize: 34, fontWeight: '900', letterSpacing: -1, marginTop: Spacing.sm, textAlign: 'center' },
  username: { color: colors.textMuted, fontSize: 16 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metric: { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSoft, borderRadius: Radii.medium, borderWidth: 1, flexBasis: '31%', flexGrow: 1, minHeight: 92, minWidth: 100, padding: Spacing.md },
  metricValue: { color: colors.text, fontSize: 25, fontWeight: '900' },
  metricLabel: { color: colors.textMuted, fontSize: 12, marginTop: Spacing.xs },
  settingsRow: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.medium, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 72, paddingHorizontal: Spacing.lg },
  settingsTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  settingsCopy: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  sectionTitle: { color: colors.text, fontSize: 21, fontWeight: '800', marginBottom: Spacing.md },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  badge: { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSoft, borderRadius: Radii.medium, borderWidth: 1, flexBasis: '31%', flexGrow: 1, minHeight: 145, minWidth: 100, padding: Spacing.md },
  lockedBadge: { opacity: 0.48 },
  badgeIcon: { fontSize: 27, marginBottom: Spacing.xs },
  badgeName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  badgeDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: Spacing.xs },
  historyList: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: Radii.medium, borderWidth: 1, overflow: 'hidden' },
  historyRow: { alignItems: 'center', borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: Spacing.md, minHeight: 76, padding: Spacing.md },
  historyArtwork: { backgroundColor: colors.surfaceHighest, borderRadius: Radii.small, height: 52, width: 52 },
  artworkFallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackMusic: { color: colors.brand, fontSize: 24 },
  historyCopy: { flex: 1, gap: 3, minWidth: 0 },
  historyTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  historyArtist: { color: colors.textMuted, fontSize: 13 },
  historyScore: { color: colors.brandLight, fontSize: 14, fontWeight: '800' },
  analyticsGrid: { gap: Spacing.md },
  analyticsCard: { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSoft, borderRadius: Radii.medium, borderWidth: 1, padding: Spacing.lg },
  analyticsRow: { alignItems: 'center', borderTopColor: colors.borderSoft, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  analyticsName: { color: colors.textMuted, flex: 1, fontSize: 14 },
  analyticsCount: { color: colors.text, fontSize: 14, fontWeight: '800' },
  emptyCopy: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  inlineError: { backgroundColor: 'rgba(245, 196, 92, 0.1)', borderColor: 'rgba(245, 196, 92, 0.3)', borderRadius: Radii.small, borderWidth: 1, padding: Spacing.md },
  inlineErrorText: { color: colors.warning, fontSize: 14, lineHeight: 20 },
  errorTitle: { color: colors.text, fontSize: 24, fontWeight: '800' },
  pressed: { opacity: 0.76 },
  backButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 },
});
