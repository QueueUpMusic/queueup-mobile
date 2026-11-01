import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Action, ErrorMessage } from '@/components/auth-ui';
import { PlayerAvatar } from '@/components/player-avatar';
import { CachedImage } from '@/components/cached-image';
import { PlayerHeader } from '@/components/player-header';
import { ArrowRight, ChevronLeft } from '@/components/queueup-icon';
import { colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { getProfile } from '@/lib/api';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import { ApiError, ProfileBadge, ProfileResponse } from '@/types';
import { resolveServerUrl } from '@/config/server';

function formatAverage(value: number): string { return value.toFixed(2); }

function ProfileMetric({ label, value }: { label: string; value: string | number }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function BadgeIcon({ badge, onPress }: { badge: ProfileBadge; onPress: () => void }) {
  return <Pressable
    accessibilityLabel={`${badge.name}, ${badge.earned ? 'earned' : 'not earned'}`}
    accessibilityHint="Shows the badge title and description"
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.badge, badge.earned && styles.earnedBadge, pressed && styles.pressed]}
  ><Text style={[styles.badgeIcon, !badge.earned && styles.lockedIcon]}>{badge.icon}</Text></Pressable>;
}

function AnalyticsList({ title, values }: { title: string; values: [string, number][] }) {
  if (!values.length) return null;
  return <View style={styles.analyticsCard}><Text style={styles.sectionTitle}>{title}</Text>{values.slice(0, 5).map(([name, count]) => <View key={name} style={styles.analyticsRow}><Text numberOfLines={1} style={styles.analyticsName}>{name}</Text><Text style={styles.analyticsCount}>{count}</Text></View>)}</View>;
}

function ProfileHeader({ onBack }: { onBack: () => void }) {
  return <PlayerHeader leftAction={<Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={8} onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><ChevronLeft color={colors.brand} size={24} /></Pressable>} showAvatar={false} />;
}

export function ProfileScreen() {
  const router = useRouter();
  const { user, refresh: refreshSession } = useAuth();
  const { username: routeUsername } = useLocalSearchParams<{ username?: string }>();
  const profileUsername = routeUsername ?? user?.username;
  const isOwnProfile = Boolean(user && profileUsername && user.username.toLowerCase() === profileUsername.toLowerCase());
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [avatarExpanded, setAvatarExpanded] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<ProfileBadge | null>(null);
  const requestInFlight = useRef(false);

  const load = useCallback(async (pull = false, background = false) => {
    if (!user || !profileUsername) return;
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (pull) setRefreshing(true); else if (!background) setLoading(true);
    setError(null);
    try {
      setProfile(await getProfile(profileUsername));
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Unable to load your profile.');
      if (apiError.statusCode === 401) {
        setProfile(null);
        await refreshSession();
      } else setError(apiError);
    } finally {
      if (!background) setLoading(false);
      setRefreshing(false);
      requestInFlight.current = false;
    }
  }, [profileUsername, refreshSession, user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useLiveRefresh(() => load(false, true), null);

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
        {isOwnProfile || !player.picture_url ? <PlayerAvatar size={96} user={player} /> : <Pressable accessibilityHint="Enlarges the profile picture" accessibilityLabel={`View ${player.display_name}'s profile picture`} accessibilityRole="button" onPress={() => setAvatarExpanded(true)} style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}><PlayerAvatar size={96} user={player} /></Pressable>}
        <Text style={styles.displayName}>{player.display_name}</Text>
        <Text style={styles.username}>@{player.username}</Text>
      </View>

      {!isOwnProfile && player.picture_url ? <Modal animationType="fade" onRequestClose={() => setAvatarExpanded(false)} transparent visible={avatarExpanded}>
        <Pressable accessibilityLabel="Close enlarged profile picture" accessibilityRole="button" onPress={() => setAvatarExpanded(false)} style={styles.avatarModalBackdrop}>
          <View style={styles.enlargedAvatarFrame}>
            <CachedImage accessibilityLabel={`${player.display_name} profile picture`} contentFit="contain" source={{ uri: resolveServerUrl(player.picture_url) ?? undefined }} style={styles.enlargedAvatar} />
          </View>
        </Pressable>
      </Modal> : null}

      {isOwnProfile ? <View style={styles.profileMenu}>
        <Pressable accessibilityHint="Edit your display name or profile picture" accessibilityRole="button" onPress={() => router.push('/profile/edit')} style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}>
          <View><Text style={styles.settingsTitle}>Edit profile</Text><Text style={styles.settingsCopy}>Name and profile picture</Text></View><ArrowRight color={colors.brandLight} size={20} />
        </Pressable>
        <Pressable accessibilityHint="Opens account and app settings" accessibilityRole="button" onPress={() => router.push('/settings')} style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}>
          <View><Text style={styles.settingsTitle}>Settings</Text><Text style={styles.settingsCopy}>Account and app preferences</Text></View><ArrowRight color={colors.brandLight} size={20} />
        </Pressable>
      </View> : null}

      <View style={styles.metricGrid}>
        <ProfileMetric label="Wins" value={metrics.wins} />
        <ProfileMetric label="Podiums" value={metrics.podiums} />
        <ProfileMetric label="Avg score" value={formatAverage(metrics.average_received)} />
        <ProfileMetric label="Win rate" value={`${metrics.win_rate.toFixed(0)}%`} />
        <ProfileMetric label="Avg place" value={metrics.average_placement ? metrics.average_placement.toFixed(1) : '—'} />
        <ProfileMetric label="Rounds" value={metrics.round_count} />
      </View>

      <View style={styles.badgeSection}>
        <View style={styles.sectionHeading}><Text style={styles.badgeSectionTitle}>Badges</Text><Text style={styles.badgeCount}>{profile.badges.filter((badge) => badge.earned).length} / {profile.badges.length} earned</Text></View>
        <Text style={styles.badgeHint}>Tap an icon to explore an achievement.</Text>
        {profile.badges.length ? <View style={styles.badgeGrid}>{profile.badges.map((badge) => <BadgeIcon badge={badge} key={badge.key} onPress={() => setSelectedBadge(badge)} />)}</View> : <Text style={styles.emptyCopy}>Achievements will appear here as you play.</Text>}
      </View>

      <Pressable accessibilityHint="Browse and search revealed submissions" accessibilityRole="button" onPress={() => router.push({ pathname: '/profile/[username]/history', params: { username: player.username } })} style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}>
        <View style={styles.menuCopy}><Text style={styles.settingsTitle}>Submission history</Text><Text style={styles.settingsCopy}>Browse and search {profile.history.length} revealed {profile.history.length === 1 ? 'song' : 'songs'}</Text></View><ArrowRight color={colors.brandLight} size={20} />
      </Pressable>

      <View style={styles.analyticsGrid}><AnalyticsList title="Favorite genres" values={profile.favorite_genres} /><AnalyticsList title="Most submitted artists" values={profile.most_submitted_artists} /></View>
    </ScrollView>
    <Modal animationType="fade" onRequestClose={() => setSelectedBadge(null)} transparent visible={selectedBadge !== null}>
      <View style={styles.badgeModalBackdrop}>
        <Pressable accessibilityLabel="Close badge details" accessibilityRole="button" onPress={() => setSelectedBadge(null)} style={StyleSheet.absoluteFill} />
        {selectedBadge ? <View accessibilityViewIsModal style={styles.badgeModalCard}>
          <ScrollView contentContainerStyle={styles.badgeModalContent}>
            <View style={[styles.badge, selectedBadge.earned && styles.earnedBadge]}><Text style={[styles.badgeIcon, !selectedBadge.earned && styles.lockedIcon]}>{selectedBadge.icon}</Text></View>
            <Text style={[styles.badgeStatus, selectedBadge.earned && styles.earnedStatus]}>{selectedBadge.earned ? 'Earned' : 'Not earned yet'}</Text>
            <Text accessibilityRole="header" style={styles.badgeName}>{selectedBadge.name}</Text>
            <Text style={styles.badgeDescription}>{selectedBadge.description}</Text>
            <Action secondary onPress={() => setSelectedBadge(null)}>Close</Action>
          </ScrollView>
        </View> : null}
      </View>
    </Modal>
  </View>;
}

export default function OwnProfileScreen() {
  return <ProfileScreen />;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { alignSelf: 'center', gap: Spacing.xl, maxWidth: 800, padding: Spacing.xl, paddingBottom: Spacing.xxxl, width: '100%' },
  centerState: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  hero: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  avatarButton: { borderRadius: 52 },
  avatarModalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.88)', flex: 1, justifyContent: 'center', padding: Spacing.xl },
  enlargedAvatarFrame: { aspectRatio: 1, maxHeight: 360, maxWidth: 360, width: '100%' },
  enlargedAvatar: { height: '100%', width: '100%' },
  displayName: { color: colors.text, fontSize: 34, fontWeight: '900', letterSpacing: -1, marginTop: Spacing.sm, textAlign: 'center' },
  username: { color: colors.textMuted, fontSize: 16 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metric: { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSoft, borderRadius: Radii.medium, borderWidth: 1, flexBasis: '31%', flexGrow: 1, minHeight: 92, minWidth: 100, padding: Spacing.md },
  metricValue: { color: colors.text, fontSize: 25, fontWeight: '900' },
  metricLabel: { color: colors.textMuted, fontSize: 12, marginTop: Spacing.xs },
  settingsRow: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.medium, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 72, paddingHorizontal: Spacing.lg },
  profileMenu: { gap: Spacing.sm },
  settingsTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  settingsCopy: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  sectionTitle: { color: colors.text, fontSize: 21, fontWeight: '800', marginBottom: Spacing.md },
  menuCopy: { flex: 1, paddingVertical: Spacing.md, paddingRight: Spacing.sm },
  badgeSection: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: Radii.medium, borderWidth: 1, padding: Spacing.lg },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'space-between' },
  badgeSectionTitle: { color: colors.text, fontSize: 21, fontWeight: '800' },
  badgeCount: { color: colors.brandLight, fontSize: 13, fontWeight: '700' },
  badgeHint: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: Spacing.lg, marginTop: Spacing.xs },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, justifyContent: 'center' },
  badge: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: 32, borderWidth: 1, height: 64, justifyContent: 'center', width: 64 },
  earnedBadge: { backgroundColor: 'rgba(32, 223, 114, 0.14)', borderColor: colors.brand, boxShadow: '0 0 12px rgba(32, 223, 114, 0.16)' },
  lockedIcon: { opacity: 0.25 },
  badgeIcon: { fontSize: 30, height: 44, includeFontPadding: false, lineHeight: 44, textAlign: 'center', textAlignVertical: 'center', width: 44 },
  badgeModalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.78)', flex: 1, justifyContent: 'center', padding: Spacing.xl },
  badgeModalCard: { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.large, borderWidth: 1, maxHeight: '85%', maxWidth: 400, width: '100%' },
  badgeModalContent: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xl },
  badgeStatus: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  earnedStatus: { color: colors.brandLight },
  badgeName: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  badgeDescription: { color: colors.textMuted, fontSize: 16, lineHeight: 24, textAlign: 'center' },
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
