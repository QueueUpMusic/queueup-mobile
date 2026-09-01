import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, ErrorMessage } from '@/components/auth-ui';
import { CheckboxIcon, Checkmark, ChevronLeft, PauseIcon, PlayIcon, SearchIcon } from '@/components/queueup-icon';
import { SpotifyPreviewModal } from '@/components/spotify-preview-modal';
import { colors, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { acceptSubmissionRules, createSubmission, getRoundDetail, getSubmissionStatus, searchSpotify } from '@/lib/api';
import { ApiError, RoundSummary, SpotifySearchTrack, SubmissionTrack } from '@/types';

type ScreenState = 'search' | 'review' | 'success';
const queueUpLogo = require('../../../../assets/images/queueup-logo.png');

function Artwork({ track, large = false }: { track: SpotifySearchTrack | SubmissionTrack; large?: boolean }) {
  const uri = 'art' in track ? track.art : track.album_art_url;
  return uri ? <Image accessibilityLabel={`${track.album} artwork`} resizeMode="cover" source={{ uri }} style={large ? styles.successArtwork : styles.artwork} /> : <View style={large ? styles.successArtwork : styles.artwork}><Text style={styles.artworkFallback}>♫</Text></View>;
}

function Header({ label, onBack }: { label: string; onBack: () => void }) {
  return <View style={styles.header}><Pressable accessibilityLabel={`Go to ${label.toLowerCase()}`} accessibilityRole="button" hitSlop={8} onPress={onBack} style={styles.back}><ChevronLeft color={colors.brand} size={24} /><Text style={styles.backLabel}>{label}</Text></Pressable><Text style={styles.headerTitle}>Your submission</Text><View style={styles.headerSpacer} /></View>;
}

function RoundContext({ round }: { round: RoundSummary }) {
  return <View style={styles.context}><Text style={styles.eyebrow}>{round.season.name}</Text><Text style={styles.prompt}>{round.prompt}</Text>{round.details ? <Text style={styles.details}>{round.details}</Text> : null}</View>;
}

function TrackRow({ track, selectedPreview, onChoose, onPreview }: { track: SpotifySearchTrack; selectedPreview: SpotifySearchTrack | null; onChoose: () => void; onPreview: () => void }) {
  const unavailable = track.used || track.available === false || track.explicit;
  const reason = track.used ? 'Already submitted this round' : track.explicit ? 'Explicit songs are not allowed' : 'Unavailable for submission';
  const isPlaying = selectedPreview?.id === track.id;
  return <View style={[styles.resultRow, unavailable && styles.unavailableRow]}><Artwork track={track} /><View style={styles.resultCopy}><Text numberOfLines={2} style={styles.resultTitle}>{track.title}</Text><Text numberOfLines={1} style={styles.resultArtist}>{track.artist}</Text><Text numberOfLines={1} style={styles.resultAlbum}>{track.album}</Text>{unavailable ? <Text style={styles.unavailableText}>{reason}</Text> : null}</View><View style={styles.rowActions}><Pressable accessibilityLabel={`${isPlaying ? 'Close' : 'Preview'} ${track.title}`} accessibilityRole="button" onPress={onPreview} style={({ pressed }) => [styles.previewButton, pressed && styles.pressed]}>{isPlaying ? <PauseIcon color={colors.brandLight} size={17} /> : <PlayIcon color={colors.brandLight} size={17} />}<Text style={styles.previewText}>{isPlaying ? 'Close' : 'Preview'}</Text></Pressable><Pressable accessibilityLabel={`Choose ${track.title}`} accessibilityRole="button" disabled={unavailable} onPress={onChoose} style={({ pressed }) => [styles.chooseButton, pressed && styles.pressed, unavailable && styles.disabled]}><Text style={styles.chooseText}>Choose</Text></Pressable></View></View>;
}

export default function SubmitSongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { refresh: refreshSession } = useAuth();
  const roundId = Number(id);
  const [round, setRound] = useState<RoundSummary | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<SubmissionTrack | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [showSubmissionGuide, setShowSubmissionGuide] = useState(false);
  const [screen, setScreen] = useState<ScreenState>('search');
  const [selected, setSelected] = useState<SpotifySearchTrack | null>(null);
  const [submitted, setSubmitted] = useState<SubmissionTrack | null>(null);
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<SpotifySearchTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [acceptingRules, setAcceptingRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [searchError, setSearchError] = useState<ApiError | null>(null);
  const [preview, setPreview] = useState<SpotifySearchTrack | null>(null);
  const requestId = useRef(0);
  const load = useCallback(async () => {
    if (!Number.isInteger(roundId) || roundId < 1) { setError(ApiError.fromHttpStatus(404, 'This round could not be found.')); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const [detail, status] = await Promise.all([getRoundDetail(roundId), getSubmissionStatus(roundId)]);
      setRound(status.round ?? detail.round);
      setExistingSubmission(status.submission ?? detail.my_submission);
      setCanSubmit(status.can_submit);
      setRulesAccepted(status.submission_rules_accepted);
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Unable to load this submission flow.');
      if (apiError.statusCode === 401) await refreshSession();
      setError(apiError);
    } finally { setLoading(false); }
  }, [refreshSession, roundId]);

  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!rulesAccepted || trimmed.length < 2) return;
    const timer = setTimeout(() => {
      const current = ++requestId.current;
      setSearching(true); setSearchError(null);
      void searchSpotify(trimmed, roundId).then((result) => {
        if (current === requestId.current) setTracks(result.tracks);
      }).catch((cause) => {
        if (current !== requestId.current) return;
        const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Spotify search failed.');
        setSearchError(apiError);
      }).finally(() => { if (current === requestId.current) setSearching(false); });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, roundId, rulesAccepted]);

  const handleAcceptRules = async () => {
    setAcceptingRules(true); setError(null);
    try {
      await acceptSubmissionRules();
      setRulesAccepted(true);
      setShowSubmissionGuide(true);
    } catch (cause) {
      setAcceptingRules(false);
      setError(cause instanceof ApiError ? cause : ApiError.networkError('We couldn’t save that confirmation.'));
    }
  };

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true); setError(null); setPreview(null);
    try {
      const result = await createSubmission(roundId, selected.id);
      const [detail, status] = await Promise.all([getRoundDetail(roundId), getSubmissionStatus(roundId)]);
      const authoritativeSubmission = status.submission ?? detail.my_submission ?? result.submission;
      setRound(status.round ?? detail.round); setExistingSubmission(authoritativeSubmission); setSubmitted(authoritativeSubmission); setCanSubmit(false); setScreen('success');
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('We couldn’t lock in your song.');
      if (apiError.statusCode === 401) await refreshSession();
      if (apiError.code === 'submission_rules_required') setRulesAccepted(false);
      setError(apiError);
    } finally { setSubmitting(false); }
  };

  if (loading) return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}><Header label="Home" onBack={() => router.replace('/(app)' as never)} /><View style={styles.center}><ActivityIndicator color={colors.brand} /></View></SafeAreaView>;
  if (error && !round) return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}><Header label="Home" onBack={() => router.replace('/(app)' as never)} /><View style={styles.center}><Text style={styles.title}>Submission unavailable</Text><ErrorMessage message={error.isNetworkError ? 'We couldn’t reach QueueUp. Check your connection and try again.' : error.message} /><Action onPress={() => void load()}>Try again</Action></View></SafeAreaView>;
  if (!round) return null;

  const unavailable = !canSubmit && !existingSubmission && screen !== 'success';
  const visibleTracks = screen === 'search' && rulesAccepted && query.trim().length >= 2 ? tracks : [];
  const visibleSearchError = query.trim().length >= 2 ? searchError : null;
  const showRulesModal = canSubmit && !rulesAccepted && screen === 'search' && !existingSubmission;
  return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}><Header label="Home" onBack={() => router.replace('/(app)' as never)} />
    {screen === 'success' && submitted ? <View style={styles.successState}><Text style={styles.successKicker}>SUBMISSION CONFIRMED</Text><Text style={styles.successTitle}>Song locked in</Text><Text style={styles.successBody}>Your pick is saved for “{round.prompt}”. It stays private until the reveal.</Text><View style={styles.successCard}><Artwork large track={submitted} /><Text numberOfLines={2} style={styles.successSong}>{submitted.title}</Text><Text numberOfLines={1} style={styles.successArtist}>{submitted.artist}</Text><View style={styles.successCheck}><Checkmark color={colors.background} size={22} /></View></View><Action secondary onPress={() => router.replace('/(app)' as never)}>Back to home</Action></View> : <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}><FlatList data={visibleTracks} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} keyExtractor={(track) => track.id} ListHeaderComponent={<>
      <RoundContext round={round} />
      {existingSubmission ? <View style={styles.lockedState}><Text style={styles.lockedTitle}>You already submitted</Text><Text style={styles.details}>This choice is final for this round.</Text><View style={styles.lockedSong}><Artwork track={existingSubmission} /><View style={styles.resultCopy}><Text numberOfLines={2} style={styles.resultTitle}>{existingSubmission.title}</Text><Text style={styles.resultArtist}>{existingSubmission.artist}</Text></View><Checkmark color={colors.brand} size={22} /></View></View> : unavailable ? <View style={styles.lockedState}><Text style={styles.lockedTitle}>Submissions aren’t available</Text><Text style={styles.details}>QueueUp says this round is no longer accepting a new song.</Text></View> : screen === 'review' && selected ? <View style={styles.reviewCard}><Text style={styles.lockedTitle}>Review your pick</Text><Text style={styles.details}>This is the song you’ll submit for “{round.prompt}”.</Text><View style={styles.reviewSong}><Artwork track={selected} /><View style={styles.resultCopy}><Text numberOfLines={2} style={styles.resultTitle}>{selected.title}</Text><Text style={styles.resultArtist}>{selected.artist}</Text><Text style={styles.resultAlbum}>{selected.album}</Text></View></View>{error ? <ErrorMessage message={error.message} /> : null}<View style={styles.reviewActions}><Action secondary onPress={() => { setError(null); setScreen('search'); }}>Change song</Action><Action disabled={submitting} onPress={() => void handleSubmit()}>{submitting ? 'Locking in…' : 'Submit song'}</Action></View></View> : <View style={styles.searchSection}><Text style={styles.sectionTitle}>Find your pick</Text><Text style={styles.details}>Search by song title, artist, album, lyrics, or paste a Spotify track link.</Text><View style={styles.searchBox}><SearchIcon color={colors.textMuted} size={20} /><TextInput accessibilityLabel="Search Spotify" autoCapitalize="none" autoCorrect={false} autoFocus keyboardType="default" onChangeText={setQuery} onSubmitEditing={() => undefined} placeholder="Search Spotify…" placeholderTextColor={colors.textMuted} returnKeyType="search" selectionColor={colors.brand} style={styles.searchInput} value={query} /><Text style={styles.searchStatus}>{searching ? '…' : ''}</Text></View>{error ? <ErrorMessage message={error.message} /> : null}{visibleSearchError ? <View style={styles.inlineError}><ErrorMessage message={visibleSearchError.isNetworkError ? 'Spotify search failed. Check your connection and try again.' : visibleSearchError.message} /><Action secondary onPress={() => setQuery((value) => `${value} `)}>Retry search</Action></View> : null}{!query.trim() ? <Text style={styles.emptyText}>Start typing to find songs.</Text> : query.trim().length < 2 ? <Text style={styles.emptyText}>Enter at least 2 characters to search.</Text> : null}</View>}
      </>} renderItem={({ item }) => <TrackRow onChoose={() => { setPreview(null); setSelected(item); setScreen('review'); setError(null); }} onPreview={() => setPreview(preview?.id === item.id ? null : item)} selectedPreview={preview} track={item} />} ListEmptyComponent={screen === 'search' && rulesAccepted && query.trim().length >= 2 && !searching && !searchError ? <Text style={styles.emptyText}>No songs found. Try another spelling, artist, album, or Spotify link.</Text> : null} /></KeyboardAvoidingView>}
    {preview ? <SpotifyPreviewModal onClose={() => setPreview(null)} trackId={preview.id} /> : null}
    <Modal animationType="fade" onRequestClose={() => undefined} transparent visible={showRulesModal}>
      <View style={styles.modalBackdrop}><View accessibilityViewIsModal style={styles.modalCard}><Image accessibilityLabel="QueueUp logo" source={queueUpLogo} style={styles.modalLogo} /><Text style={{ color: colors.brandLight, fontSize: 12, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' }}>Before you submit</Text><Text style={styles.modalTitle}>Keep every pick all-ages</Text><Text style={styles.modalBody}>Only submit clean music that is appropriate for an all-ages group. Spotify&apos;s explicit label helps, but you should also check the lyrics yourself.</Text><Pressable accessibilityLabel="Confirm clean, all-ages music" accessibilityRole="checkbox" accessibilityState={{ checked: acceptingRules, disabled: acceptingRules }} disabled={acceptingRules} onPress={() => void handleAcceptRules()} style={({ pressed }) => [styles.modalRuleRow, pressed && styles.pressed]}><CheckboxIcon checked={acceptingRules} color={colors.brand} size={26} /><Text style={styles.ruleText}>I understand and will only submit clean, all-ages music.</Text></Pressable><Text style={styles.modalHint}>Tap the checkbox to continue to song search.</Text></View></View>
    </Modal>
    <Modal animationType="fade" onRequestClose={() => setShowSubmissionGuide(false)} transparent visible={showSubmissionGuide}>
      <View style={styles.modalBackdrop}><View accessibilityViewIsModal style={styles.modalCard}><Image accessibilityLabel="QueueUp logo" source={queueUpLogo} style={styles.modalLogo} /><Text style={styles.modalEyebrow}>HOW SUBMISSION WORKS</Text><Text style={styles.modalTitle}>Choose a song for the prompt</Text><View style={styles.guideSteps}><View style={styles.guideStep}><View style={styles.guideNumber}><Text style={styles.guideNumberText}>1</Text></View><View style={styles.guideCopy}><Text style={styles.guideStepTitle}>Search QueueUp</Text><Text style={styles.guideStepBody}>Find a song by title, artist, album, lyrics you remember, or a Spotify link.</Text></View></View><View style={styles.guideStep}><View style={styles.guideNumber}><Text style={styles.guideNumberText}>2</Text></View><View style={styles.guideCopy}><Text style={styles.guideStepTitle}>Preview before choosing</Text><Text style={styles.guideStepBody}>Listen to the available Spotify preview, then choose the song that fits this round&apos;s prompt.</Text></View></View><View style={styles.guideStep}><View style={styles.guideNumber}><Text style={styles.guideNumberText}>3</Text></View><View style={styles.guideCopy}><Text style={styles.guideStepTitle}>Review and lock it in</Text><Text style={styles.guideStepBody}>Confirm your selection before submitting. Your choice is final for the round.</Text></View></View></View><Action onPress={() => setShowSubmissionGuide(false)}>Got it</Action></View></View>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 }, flex: { flex: 1 }, center: { flex: 1, justifyContent: 'center', padding: Spacing.xl }, header: { alignItems: 'center', borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: Spacing.lg }, back: { alignItems: 'center', flexDirection: 'row', gap: Spacing.xs, minHeight: 44, minWidth: 84 }, backLabel: { color: colors.brandLight, fontSize: 15, fontWeight: '700' }, headerTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, headerSpacer: { minWidth: 84 }, content: { alignSelf: 'center', gap: Spacing.md, maxWidth: 800, padding: Spacing.lg, paddingBottom: Spacing.xxxl, width: '100%' }, context: { gap: Spacing.sm, paddingVertical: Spacing.sm }, eyebrow: { color: colors.brandLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' }, prompt: { color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.8, lineHeight: 34 }, details: { color: colors.textMuted, fontSize: 14, lineHeight: 21 }, title: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: Spacing.sm }, lockedState: { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.medium, borderWidth: 1, gap: Spacing.md, padding: Spacing.lg }, lockedTitle: { color: colors.text, fontSize: 20, fontWeight: '800' }, rulesCard: { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.medium, borderWidth: 1, gap: Spacing.md, padding: Spacing.lg }, ruleRow: { alignItems: 'center', flexDirection: 'row', minHeight: 44 }, modalRuleRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md, minHeight: 44 }, checkbox: { alignItems: 'center', backgroundColor: colors.surfaceHighest, borderColor: colors.border, borderRadius: 6, borderWidth: 1, height: 24, justifyContent: 'center', marginRight: Spacing.md, width: 24 }, checkboxChecked: { backgroundColor: colors.brand, borderColor: colors.brand }, checkboxMark: { color: colors.background, fontWeight: '900' }, ruleText: { color: colors.text, flex: 1, fontSize: 14, lineHeight: 20 }, searchSection: { gap: Spacing.sm }, sectionTitle: { color: colors.text, fontSize: 22, fontWeight: '800' }, searchBox: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: Radii.small, borderWidth: 1, flexDirection: 'row', minHeight: 54, paddingHorizontal: Spacing.md }, searchInput: { color: colors.text, flex: 1, fontSize: 16, minHeight: 52, paddingHorizontal: Spacing.sm }, searchStatus: { color: colors.brand, fontSize: 20, fontWeight: '900', width: 20 }, emptyText: { color: colors.textMuted, fontSize: 14, lineHeight: 21, paddingVertical: Spacing.md }, inlineError: { gap: Spacing.xs }, resultRow: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.borderSoft, borderRadius: Radii.medium, borderWidth: 1, flexDirection: 'row', gap: Spacing.md, padding: Spacing.sm }, unavailableRow: { opacity: 0.55 }, artwork: { backgroundColor: colors.surfaceHighest, borderRadius: Radii.small, height: 64, width: 64 }, artworkFallback: { color: colors.brand, fontSize: 24, textAlign: 'center', marginTop: 17 }, resultCopy: { flex: 1, gap: 2, minWidth: 0 }, resultTitle: { color: colors.text, fontSize: 15, fontWeight: '800' }, resultArtist: { color: colors.textMuted, fontSize: 13 }, resultAlbum: { color: colors.textMuted, fontSize: 12 }, unavailableText: { color: colors.warning, fontSize: 11, fontWeight: '700', marginTop: 2 }, rowActions: { alignItems: 'flex-end', gap: Spacing.xs }, previewButton: { alignItems: 'center', flexDirection: 'row', gap: 4, minHeight: 30, paddingHorizontal: 4 }, previewText: { color: colors.brandLight, fontSize: 12, fontWeight: '800' }, chooseButton: { alignItems: 'center', backgroundColor: colors.brand, borderRadius: 9, minHeight: 34, justifyContent: 'center', paddingHorizontal: Spacing.sm }, chooseText: { color: colors.background, fontSize: 12, fontWeight: '900' }, disabled: { opacity: 0.45 }, pressed: { opacity: 0.75 }, lockedSong: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: Radii.small, flexDirection: 'row', gap: Spacing.md, padding: Spacing.sm }, reviewCard: { backgroundColor: colors.surfaceElevated, borderColor: colors.brand, borderRadius: Radii.medium, borderWidth: 1, gap: Spacing.md, padding: Spacing.lg }, reviewSong: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: Radii.small, flexDirection: 'row', gap: Spacing.md, padding: Spacing.md }, reviewActions: { gap: Spacing.sm }, successState: { alignItems: 'center', backgroundColor: colors.background, flex: 1, gap: Spacing.md, justifyContent: 'center', padding: Spacing.xl }, successKicker: { color: colors.brand, fontSize: 12, fontWeight: '900', letterSpacing: 1.3 }, successTitle: { color: colors.text, fontSize: 32, fontWeight: '900' }, successBody: { color: colors.textMuted, fontSize: 15, lineHeight: 22, maxWidth: 420, textAlign: 'center' }, successCard: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.brand, borderRadius: Radii.large, borderWidth: 1, gap: Spacing.xs, marginVertical: Spacing.md, maxWidth: 320, padding: Spacing.lg, width: '100%' }, successArtwork: { backgroundColor: colors.surfaceHighest, borderRadius: Radii.medium, height: 180, width: 180 }, successSong: { color: colors.text, fontSize: 20, fontWeight: '900', textAlign: 'center' }, successArtist: { color: colors.textMuted, fontSize: 15 }, successCheck: { alignItems: 'center', backgroundColor: colors.brand, borderRadius: 18, height: 36, justifyContent: 'center', marginTop: Spacing.sm, width: 36 }, modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.72)', flex: 1, justifyContent: 'center', padding: Spacing.xl }, modalCard: { backgroundColor: colors.surfaceElevated, borderColor: colors.brand, borderRadius: Radii.large, borderWidth: 1, gap: Spacing.md, maxWidth: 460, padding: Spacing.xl, width: '100%' }, modalLogo: { borderRadius: Radii.small, height: 56, width: 56 }, modalEyebrow: { color: colors.brandLight, fontSize: 12, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' }, modalTitle: { color: colors.text, fontSize: 24, fontWeight: '900' }, modalBody: { color: colors.textMuted, fontSize: 15, lineHeight: 22 }, modalHint: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic', lineHeight: 18 }, guideSteps: { gap: Spacing.md }, guideStep: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.sm }, guideNumber: { alignItems: 'center', backgroundColor: colors.brand, borderRadius: 16, height: 32, justifyContent: 'center', width: 32 }, guideNumberText: { color: colors.background, fontSize: 15, fontWeight: '900' }, guideCopy: { flex: 1, gap: 2 }, guideStepTitle: { color: colors.text, fontSize: 15, fontWeight: '900' }, guideStepBody: { color: colors.textMuted, fontSize: 13, lineHeight: 19 }, previewBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.72)', flex: 1, justifyContent: 'center', padding: Spacing.xl }, previewCard: { backgroundColor: colors.surfaceElevated, borderColor: colors.brand, borderRadius: Radii.large, borderWidth: 1, gap: Spacing.md, maxWidth: 460, padding: Spacing.lg, width: '100%' }, previewHeading: { color: colors.text, fontSize: 17, fontWeight: '900' }, previewError: { color: colors.textMuted, fontSize: 14, lineHeight: 20 }, spotifyWidget: { height: 152, width: '100%' },
});
