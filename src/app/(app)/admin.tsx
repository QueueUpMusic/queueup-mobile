import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Action, ErrorMessage } from '@/components/auth-ui';
import { PlayerHeader } from '@/components/player-header';
import { colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import { getStaffOverview } from '@/lib/api';
import { ApiError, StaffOverviewResponse } from '@/types';
import Svg, { Path } from 'react-native-svg';

type Capability = { title: string; description: string; icon: 'rounds' | 'players' | 'badges' | 'seasons' | 'countdowns' | 'notifications'; available: boolean };

const capabilities: Capability[] = [
  { title: 'Rounds', description: 'Review phases, schedules, and round activity.', icon: 'rounds', available: true },
  { title: 'Players', description: 'Review accounts and player approvals.', icon: 'players', available: true },
  { title: 'Badges', description: 'Review QueueUp prestige badges and awards.', icon: 'badges', available: true },
  { title: 'Seasons', description: 'Create and manage league seasons.', icon: 'seasons', available: true },
  { title: 'Countdowns', description: 'Create, edit, activate, or remove homepage countdowns.', icon: 'countdowns', available: true },
  { title: 'Notifications', description: 'Compose blasts, send them now, or schedule delivery.', icon: 'notifications', available: true },
];

function CapabilityIcon({ kind, color }: { kind: Capability['icon']; color: string }) {
  const paths: Record<Capability['icon'], string> = {
    rounds: 'M4 5h16v14H4zM8 9h8M8 13h5',
    players: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
    badges: 'm12 3 2.2 4.5 5 .7-3.6 3.5.8 5-4.4-2.4-4.4 2.4.8-5-3.6-3.5 5-.7L12 3Z',
    seasons: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
    countdowns: 'M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    notifications: 'M6 17h12l-1.4-2.1V10a4.6 4.6 0 0 0-9.2 0v4.9L6 17Zm4 3h4',
  };
  return <Svg fill="none" height={22} viewBox="0 0 24 24" width={22}><Path d={paths[kind]} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} /></Svg>;
}

function Metric({ label, value }: { label: string; value: number | undefined }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value === undefined ? '—' : value.toLocaleString()}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

export default function AdminScreen() {
  const { status, user, refresh: refreshSession } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<StaffOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const requestInFlight = useRef(false);
  const isStaff = Boolean(user?.is_staff || user?.is_superuser);

  const load = useCallback(async (pull = false, background = false) => {
    if (!isStaff || requestInFlight.current) return;
    requestInFlight.current = true;
    if (pull) setRefreshing(true); else if (!background) setLoading(true);
    setError(null);
    try {
      setOverview(await getStaffOverview());
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Unable to load staff tools.');
      if (apiError.statusCode === 401 || apiError.statusCode === 403) {
        setOverview(null);
        if (apiError.statusCode === 401) await refreshSession();
        else router.replace('/(app)' as never);
      } else setError(apiError);
    } finally {
      requestInFlight.current = false;
      if (!background) setLoading(false);
      setRefreshing(false);
    }
  }, [isStaff, refreshSession, router]);

  useFocusEffect(useCallback(() => {
    if (!isStaff) router.replace('/(app)' as never);
    else void load();
  }, [isStaff, load, router]));
  useLiveRefresh(() => load(false, true), null);

  if (status !== 'approved' || !isStaff) return <View style={styles.screen} />;
  if (loading && !overview) return <View style={styles.screen}><PlayerHeader /><View style={styles.centerState}><ActivityIndicator color={colors.brand} /></View></View>;
  if (error && !overview) return <View style={styles.screen}><PlayerHeader /><View style={styles.centerState}><Text style={styles.errorTitle}>Admin is taking a moment</Text><ErrorMessage message="We couldn’t load staff tools right now." /><Action onPress={() => void load()}>Try again</Action></View></View>;

  return <View style={styles.screen}>
    <PlayerHeader />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl colors={[colors.brand]} onRefresh={() => void load(true)} refreshing={refreshing} tintColor={colors.brand} />}>
      <View style={styles.intro}><Text style={styles.kicker}>Staff only</Text><Text style={styles.title}>Admin</Text><Text style={styles.subtitle}>League Control</Text></View>
      {error ? <Text style={styles.inlineError}>Some staff data may be out of date. Pull to try again.</Text> : null}
      <View style={styles.metrics}><Metric label="Players" value={overview?.user_count} /><Metric label="Seasons" value={overview?.season_count} /><Metric label="Rounds" value={overview?.round_count} /><Metric label="Badges" value={overview?.badge_count} /></View>
      <View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => router.push('/admin/rounds/new' as never)} style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}><Text style={styles.actionTitle}>Create Round</Text><Text style={styles.actionCopy}>Set the prompt, schedule, and publishing state.</Text><Text style={styles.coming}>Create now →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push('/admin/seasons/new' as never)} style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}><Text style={styles.actionTitle}>Create Season</Text><Text style={styles.actionCopy}>Start a new season with dates and player-facing details.</Text><Text style={styles.coming}>Create now →</Text></Pressable></View>
      <Text style={styles.section}>Management</Text>
      <View style={styles.capabilities}>{capabilities.map((item) => { const paths: Record<string, string> = { Rounds: '/admin/rounds', Players: '/admin/players', Badges: '/admin/badges', Seasons: '/admin/seasons', Countdowns: '/admin/countdowns', Notifications: '/admin/notifications' }; const route = paths[item.title]; const content = <><View style={styles.capabilityIcon}><CapabilityIcon color={item.available ? colors.brand : colors.textMuted} kind={item.icon} /></View><View style={styles.capabilityCopy}><Text style={styles.capabilityTitle}>{item.title}</Text><Text style={styles.capabilityDescription}>{item.description}</Text></View>{item.available ? <Text style={styles.available}>Open →</Text> : <Text style={styles.deferred}>Deferred</Text>}</>; return route ? <Pressable accessibilityRole="button" key={item.title} onPress={() => router.push(route as never)} style={({ pressed }) => [styles.capability, pressed && styles.pressed]}>{content}</Pressable> : <View key={item.title} style={[styles.capability, !item.available && styles.disabledCapability]}>{content}</View>; })}</View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { alignSelf: 'center', flexGrow: 1, gap: Spacing.lg, maxWidth: 800, padding: Spacing.xl, paddingBottom: Spacing.xxxl, width: '100%' },
  centerState: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  intro: { gap: Spacing.xs, marginTop: Spacing.sm },
  kicker: { color: colors.brandLight, fontSize: 12, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 38, fontWeight: '900', letterSpacing: -1.2 },
  subtitle: { color: colors.textMuted, fontSize: 17, fontWeight: '700' },
  metrics: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: Radii.medium, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' },
  metric: { borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, padding: Spacing.lg, width: '50%' },
  metricValue: { color: colors.text, fontSize: 26, fontWeight: '900' },
  metricLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionCard: { backgroundColor: 'rgba(32, 223, 114, 0.09)', borderColor: 'rgba(32, 223, 114, 0.25)', borderRadius: Radii.small, borderWidth: 1, flex: 1, gap: Spacing.xs, padding: Spacing.md },
  actionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  actionCopy: { color: colors.textMuted, flexGrow: 1, fontSize: 12, lineHeight: 18 },
  coming: { color: colors.brandLight, fontSize: 11, fontWeight: '800' },
  section: { color: colors.text, fontSize: 20, fontWeight: '900' },
  capabilities: { gap: Spacing.sm },
  capability: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: Radii.small, borderWidth: 1, flexDirection: 'row', gap: Spacing.md, minHeight: 72, padding: Spacing.md },
  disabledCapability: { opacity: 0.62 },
  capabilityIcon: { alignItems: 'center', backgroundColor: 'rgba(32, 223, 114, 0.1)', borderRadius: 10, height: 42, justifyContent: 'center', width: 42 },
  capabilityCopy: { flex: 1, gap: 3, minWidth: 0 },
  capabilityTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  capabilityDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  available: { color: colors.brandLight, fontSize: 10, fontWeight: '800' },
  deferred: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  pressed: { opacity: 0.78 },
  inlineError: { color: colors.warning, fontSize: 13 },
  errorTitle: { color: colors.text, fontSize: 24, fontWeight: '800' },
});
