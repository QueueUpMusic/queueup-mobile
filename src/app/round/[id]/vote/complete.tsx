import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, ErrorMessage } from '@/components/auth-ui';
import { Checkmark, ChevronLeft } from '@/components/queueup-icon';
import { colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { getRoundDetail } from '@/lib/api';
import { ApiError, RoundDetailResponse } from '@/types';

export default function VoteCompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { refresh: refreshSession } = useAuth();
  const [detail, setDetail] = useState<RoundDetailResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const load = useCallback(async () => {
    try {
      const next = await getRoundDetail(Number(id));
      setDetail(next);
      if (!next.ballot.complete && next.round.state === 'voting') router.replace(`/round/${id}/vote?review=1` as never);
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Unable to load your completed ballot.');
      if (apiError.statusCode === 401) await refreshSession(); else setError(apiError);
    }
  }, [id, refreshSession, router]);
  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);
  const goHome = () => router.dismissTo('/(app)' as never);
  return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}><View style={styles.header}><Pressable accessibilityLabel="Go to home" accessibilityRole="button" hitSlop={8} onPress={goHome} style={styles.back}><ChevronLeft color={colors.brand} size={24} /><Text style={styles.backLabel}>Home</Text></Pressable><Text style={styles.headerTitle}>Voting complete</Text><View style={styles.spacer} /></View>{!detail && !error ? <View style={styles.center}><ActivityIndicator color={colors.brand} /></View> : error ? <View style={styles.center}><Text style={styles.title}>Voting status unavailable</Text><ErrorMessage message={error.isNetworkError ? 'We couldn’t reach QueueUp. Check your connection and try again.' : error.message} /><Action onPress={() => void load()}>Try again</Action></View> : <View style={styles.center}><View style={styles.check}><Checkmark color={colors.background} size={28} /></View><Text style={styles.kicker}>BALLOT SAVED</Text><Text style={styles.title}>You’re all caught up!</Text><Text style={styles.body}>Your votes have been saved successfully.</Text><View style={styles.metrics}><Text style={styles.metricValue}>{detail?.ballot.voted_count} of {detail?.ballot.eligible_count}</Text><Text style={styles.metricLabel}>songs rated</Text></View>{detail?.round.state === 'voting' ? <Text style={styles.body}>You can review or edit your ratings while voting remains open.</Text> : null}<View style={styles.actions}>{detail?.round.state === 'voting' ? <Action secondary onPress={() => router.replace(`/round/${id}/vote?review=1` as never)}>Review ratings</Action> : null}<Action onPress={goHome}>Go home</Action></View></View>}</SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'center', borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: Spacing.lg }, back: { alignItems: 'center', flexDirection: 'row', gap: Spacing.xs, minHeight: 44, minWidth: 84 }, backLabel: { color: colors.brandLight, fontSize: 15, fontWeight: '700' }, headerTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, spacer: { minWidth: 84 }, center: { alignItems: 'center', flex: 1, gap: Spacing.md, justifyContent: 'center', padding: Spacing.xl }, check: { alignItems: 'center', backgroundColor: colors.brand, borderRadius: 30, height: 60, justifyContent: 'center', width: 60 }, kicker: { color: colors.brandLight, fontSize: 12, fontWeight: '900', letterSpacing: 1.3 }, title: { color: colors.text, fontSize: 30, fontWeight: '900', textAlign: 'center' }, body: { color: colors.textMuted, fontSize: 15, lineHeight: 22, maxWidth: 360, textAlign: 'center' }, metrics: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.medium, borderWidth: 1, marginVertical: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md }, metricValue: { color: colors.brandLight, fontSize: 25, fontWeight: '900' }, metricLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 }, actions: { width: '100%', maxWidth: 420 } });
