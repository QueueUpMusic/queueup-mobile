import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Action, ErrorMessage } from '@/components/auth-ui';
import { PlayerHeader } from '@/components/player-header';
import { colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { getDashboard } from '@/lib/api';
import { ApiError, DashboardResponse, RoundSummary } from '@/types';

function formatDate(value: string) { return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }

function RoundCard({ round, submission }: { round: RoundSummary; submission: DashboardResponse['my_submission'] }) {
  const router = useRouter();
  return <View style={styles.card}><View style={styles.eyebrow}><Text style={styles.pill}>{round.state.replace('_', ' ').toUpperCase()}</Text><Text style={styles.muted}>{round.season.name}</Text></View><Text style={styles.prompt}>{round.prompt}</Text>{round.details ? <Text style={styles.body}>{round.details}</Text> : null}<Text style={styles.deadline}>Submissions close {formatDate(round.submission_deadline)}</Text><Text style={styles.deadline}>Reveal {formatDate(round.reveal_at)}</Text>{submission ? <Text style={styles.success}>Your pick: {submission.title} · {submission.artist}</Text> : <Text style={styles.muted}>No submission recorded yet.</Text>}<Action secondary onPress={() => router.push(`/round/${round.id}` as never)}>View round</Action></View>;
}

export default function HomeScreen() {
  const { refresh: refreshSession } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState<ApiError | null>(null); const requestInFlight = useRef(false);
  const load = useCallback(async (pull = false) => { if (requestInFlight.current) return; requestInFlight.current = true; if (pull) setRefreshing(true); else setLoading(true); setError(null); try { setDashboard(await getDashboard()); } catch (cause) { const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Unable to load your QueueUp home.'); if (apiError.statusCode === 401) { await refreshSession(); } else setError(apiError); } finally { requestInFlight.current = false; setLoading(false); setRefreshing(false); } }, [refreshSession]);
  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading && !dashboard) return <View style={styles.screen}><PlayerHeader /><View style={styles.centerState}><ActivityIndicator color={colors.brand} /></View></View>;
  if (error && !dashboard) return <View style={styles.screen}><PlayerHeader /><View style={styles.centerState}><Text style={styles.title}>Home is taking a moment</Text><ErrorMessage message="We couldn’t load your latest QueueUp updates." /><Action onPress={() => void load()}>Try again</Action></View></View>;
  const current = dashboard?.current_round; const results = dashboard?.results_round;
  return <View style={styles.screen}><PlayerHeader /><ScrollView style={styles.scroll} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.brand} colors={[colors.brand]} />}><>{error ? <Text style={styles.muted}>Some updates may be unavailable. Pull to try again.</Text> : null}{current ? <><Text style={styles.section}>Current round</Text><RoundCard round={current} submission={dashboard?.my_submission ?? null} /></> : null}{results ? <><Text style={styles.section}>Recent results</Text><RoundCard round={results} submission={null} /></> : null}{!current && !results ? <View style={styles.empty}><Text style={styles.title}>No round yet</Text><Text style={styles.body}>There isn’t a current or recently revealed round to show.</Text></View> : null}</></ScrollView></View>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, scroll: { flex: 1 }, content: { flexGrow: 1, padding: Spacing.xl, paddingBottom: 40, gap: Spacing.md, maxWidth: 800, width: '100%', alignSelf: 'center' }, centerState: { flex: 1, justifyContent: 'center', padding: Spacing.xl }, section: { color: colors.textMuted, fontSize: 14, fontWeight: '700', letterSpacing: 1, marginTop: Spacing.lg, textTransform: 'uppercase' }, card: { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.medium, borderWidth: 1, padding: Spacing.xl, gap: Spacing.sm }, eyebrow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm }, pill: { backgroundColor: colors.brand, borderRadius: Radii.small, color: colors.background, fontSize: 11, fontWeight: '800', overflow: 'hidden', paddingHorizontal: Spacing.sm, paddingVertical: 4 }, prompt: { color: colors.text, fontSize: 24, fontWeight: '800', lineHeight: 30, marginTop: Spacing.sm }, body: { color: colors.textMuted, fontSize: 15, lineHeight: 22 }, deadline: { color: colors.textMuted, fontSize: 13 }, muted: { color: colors.textMuted, fontSize: 14 }, success: { color: colors.brandLight, fontSize: 14, fontWeight: '700', marginTop: Spacing.sm }, title: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: Spacing.xxl }, empty: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, flex: 1, minHeight: 360 }, });
