import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Action, ErrorMessage } from '@/components/auth-ui';
import { CachedImage } from '@/components/cached-image';
import { PlayerHeader } from '@/components/player-header';
import { ChevronLeft, SearchIcon } from '@/components/queueup-icon';
import { colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import { getProfile } from '@/lib/api';
import { ApiError, ProfileResponse, RevealedSubmission } from '@/types';

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function HistoryRow({ submission }: { submission: RevealedSubmission }) {
  return <View style={styles.row}>
    {submission.album_art_url ? <CachedImage accessibilityLabel={`${submission.title} artwork`} source={{ uri: submission.album_art_url }} style={styles.artwork} /> : <View style={[styles.artwork, styles.artworkFallback]}><Text style={styles.music}>♫</Text></View>}
    <View style={styles.songCopy}>
      <Text style={styles.songTitle}>{submission.title}</Text>
      <Text style={styles.artist}>{submission.artist}</Text>
      {submission.album ? <Text style={styles.album}>{submission.album}</Text> : null}
    </View>
    <Text accessibilityLabel={`Average score ${submission.average_score.toFixed(2)}`} style={styles.score}>{submission.average_score.toFixed(2)} ★</Text>
  </View>;
}

export default function SubmissionHistoryScreen() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();
  const { refresh: refreshSession } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [query, setQuery] = useState('');
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
      setProfile(await getProfile(username));
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Unable to load submission history.');
      if (apiError.statusCode === 401) {
        setProfile(null);
        await refreshSession();
      } else setError(apiError);
    } finally {
      requestInFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshSession, username]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useLiveRefresh(() => load(false, true));

  const submissions = useMemo(() => {
    const terms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
    return (profile?.history ?? []).filter((submission) => {
      const text = normalizeSearch(`${submission.title} ${submission.artist} ${submission.album}`);
      return terms.every((term) => text.includes(term));
    });
  }, [profile, query]);

  const header = <PlayerHeader leftAction={<Pressable accessibilityLabel="Go back to profile" accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/profile/[username]', params: { username } })} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><ChevronLeft color={colors.brand} /></Pressable>} showAvatar={false} />;

  if (loading && !profile) return <View style={styles.screen}>{header}<View style={styles.center}><ActivityIndicator color={colors.brand} /></View></View>;
  if (error && !profile) return <View style={styles.screen}>{header}<View style={styles.center}><Text style={styles.emptyTitle}>History is taking a moment</Text><ErrorMessage message="We couldn’t load submission history right now." /><Action onPress={() => void load()}>Try again</Action></View></View>;

  return <View style={styles.screen}>
    {header}
    <View style={styles.intro}>
      <Text accessibilityRole="header" style={styles.title}>Submission history</Text>
      <Text style={styles.subtitle}>{profile?.player.display_name ?? username} · Revealed songs</Text>
      <View style={styles.search}>
        <SearchIcon color={colors.textMuted} size={20} />
        <TextInput accessibilityLabel="Search submission history" autoCapitalize="none" autoCorrect={false} onChangeText={setQuery} placeholder="Search songs, artists, or albums" placeholderTextColor={colors.textMuted} returnKeyType="search" selectionColor={colors.brand} style={styles.input} value={query} />
        {query ? <Pressable accessibilityLabel="Clear search" accessibilityRole="button" onPress={() => setQuery('')} style={styles.clear}><Text style={styles.clearText}>Clear</Text></Pressable> : null}
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.resultCount}>{submissions.length} {submissions.length === 1 ? 'song' : 'songs'}{query.trim() ? ` of ${profile?.history.length ?? 0}` : ''}</Text>
      {error ? <ErrorMessage message="History may be out of date. Pull to refresh." /> : null}
    </View>
    <FlatList
      contentContainerStyle={styles.list}
      data={submissions}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      keyExtractor={(submission) => String(submission.id)}
      ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>{profile?.history.length ? 'No matching songs' : 'No revealed submissions yet'}</Text><Text style={styles.emptyCopy}>{profile?.history.length ? 'Try another song, artist, or album.' : 'Songs will appear here after their rounds are revealed.'}</Text>{query ? <Action secondary onPress={() => setQuery('')}>Clear search</Action> : null}</View>}
      refreshControl={<RefreshControl colors={[colors.brand]} onRefresh={() => void load(true)} refreshing={refreshing} tintColor={colors.brand} />}
      renderItem={({ item }) => <HistoryRow submission={item} />}
    />
  </View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  back: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 },
  pressed: { opacity: 0.76 },
  center: { flex: 1, gap: Spacing.md, justifyContent: 'center', padding: Spacing.xl },
  intro: { alignSelf: 'center', gap: Spacing.sm, maxWidth: 800, padding: Spacing.xl, paddingBottom: Spacing.md, width: '100%' },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 15 },
  search: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.small, borderWidth: 1, flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, paddingHorizontal: Spacing.md },
  input: { color: colors.text, flex: 1, fontSize: 15, minHeight: 52, minWidth: 0, paddingVertical: Spacing.sm },
  clear: { justifyContent: 'center', minHeight: 44 },
  clearText: { color: colors.brandLight, fontSize: 13, fontWeight: '700' },
  resultCount: { color: colors.textMuted, fontSize: 13 },
  list: { alignSelf: 'center', flexGrow: 1, gap: Spacing.sm, maxWidth: 800, padding: Spacing.xl, paddingTop: 0, paddingBottom: Spacing.xxxl, width: '100%' },
  row: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: Radii.medium, borderWidth: 1, flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
  artwork: { backgroundColor: colors.surfaceHighest, borderRadius: Radii.small, height: 52, width: 52 },
  artworkFallback: { alignItems: 'center', justifyContent: 'center' },
  music: { color: colors.brand, fontSize: 24 },
  songCopy: { flex: 1, gap: 3, minWidth: 0 },
  songTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  artist: { color: colors.textMuted, fontSize: 13 },
  album: { color: colors.textMuted, fontSize: 12 },
  score: { color: colors.brandLight, fontSize: 14, fontWeight: '800', flexShrink: 0 },
  empty: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxxl },
  emptyTitle: { color: colors.text, fontSize: 21, fontWeight: '800', textAlign: 'center' },
  emptyCopy: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
