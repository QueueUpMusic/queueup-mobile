import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Action, ErrorMessage } from '@/components/auth-ui';
import { ChevronLeft } from '@/components/queueup-icon';
import { colors, Radii, Spacing } from '@/constants/theme';
import { getStaffSeasons } from '@/lib/api';
import { ApiError, StaffSeason } from '@/types';

export default function StaffSeasonsScreen() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<StaffSeason[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else if (!seasons) setError(null);
    try { setSeasons((await getStaffSeasons()).seasons); setError(null); } catch (cause) { setError(cause instanceof ApiError ? cause : ApiError.networkError('Unable to load seasons.')); } finally { setRefreshing(false); }
  }, [seasons]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!seasons && !error) return <View style={styles.screen}><Header onBack={() => router.back()} /><View style={styles.center}><ActivityIndicator color={colors.brand} /></View></View>;
  if (!seasons && error) return <View style={styles.screen}><Header onBack={() => router.back()} /><View style={styles.center}><Text style={styles.title}>Seasons are taking a moment</Text><ErrorMessage message={error.message} /><Action onPress={() => void load()}>Try again</Action></View></View>;
  return <View style={styles.screen}><Header onBack={() => router.back()} /><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl colors={[colors.brand]} onRefresh={() => void load(true)} refreshing={refreshing} />}><View style={styles.heading}><Text style={styles.kicker}>Staff · Seasons</Text><Text style={styles.title}>Seasons</Text><Text style={styles.subtitle}>Edit dates, descriptions, and active status.</Text></View>{seasons?.map((season) => <View key={season.id} style={styles.card}><View style={styles.copy}><Text style={styles.name}>{season.name}</Text><Text style={styles.meta}>{season.round_count} {season.round_count === 1 ? 'round' : 'rounds'} · {season.active ? 'Active' : 'Inactive'}</Text></View><Pressable accessibilityLabel={`Edit ${season.name}`} accessibilityRole="button" onPress={() => router.push(`/admin/seasons/new?edit=${season.id}` as never)} style={({ pressed }) => [styles.edit, pressed && styles.pressed]}><Text style={styles.editText}>Edit</Text></Pressable></View>)}{!seasons?.length ? <Text style={styles.empty}>No seasons yet.</Text> : null}</ScrollView></View>;
}

function Header({ onBack }: { onBack: () => void }) { return <View style={styles.header}><Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={8} onPress={onBack}><ChevronLeft color={colors.text} /></Pressable><Text style={styles.headerTitle}>Season management</Text><View style={styles.spacer} /></View>; }

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'center', borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', padding: Spacing.xl }, headerTitle: { color: colors.text, flex: 1, fontSize: 17, fontWeight: '800', textAlign: 'center' }, spacer: { width: 24 }, center: { flex: 1, justifyContent: 'center', padding: Spacing.xl }, content: { alignSelf: 'center', gap: Spacing.md, maxWidth: 620, padding: Spacing.xl, paddingBottom: Spacing.xxxl, width: '100%' }, heading: { gap: Spacing.xs, marginBottom: Spacing.md }, kicker: { color: colors.brandLight, fontSize: 12, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase' }, title: { color: colors.text, fontSize: 30, fontWeight: '900' }, subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22 }, card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: Radii.small, borderWidth: 1, flexDirection: 'row', gap: Spacing.md, padding: Spacing.md }, copy: { flex: 1, gap: 4 }, name: { color: colors.text, fontSize: 17, fontWeight: '800' }, meta: { color: colors.textMuted, fontSize: 13 }, edit: { borderColor: colors.brand, borderRadius: 9, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }, editText: { color: colors.brandLight, fontWeight: '800' }, pressed: { opacity: 0.75 }, empty: { color: colors.textMuted, paddingVertical: Spacing.xl },
});
