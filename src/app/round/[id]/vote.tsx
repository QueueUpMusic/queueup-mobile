import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Action, ErrorMessage } from "@/components/auth-ui";
import { ChevronLeft, StarIcon } from "@/components/queueup-icon";
import { colors, Radii, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/auth";
import { SpotifyEmbed } from "@/components/spotify-preview-modal";
import { acknowledgeVotingGuide, getRoundDetail, saveVote } from "@/lib/api";
import { ApiError, RoundDetailResponse } from "@/types";
import { useLiveRefresh } from "@/hooks/use-live-refresh";

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go to home"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onBack}
        style={styles.back}
      >
        <ChevronLeft color={colors.brand} size={24} />
        <Text style={styles.backLabel}>Home</Text>
      </Pressable>
      <Text style={styles.headerTitle}>Rate songs</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function LockedState({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.lockedTitle}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {onRetry ? <Action onPress={onRetry}>Try again</Action> : null}
    </View>
  );
}

function VotingGuideModal({
  saving,
  onContinue,
}: {
  saving: boolean;
  onContinue: () => void;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={() => undefined}
      transparent
      visible
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.72)",
          flex: 1,
          justifyContent: "center",
          padding: Spacing.xl,
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.brand,
            borderRadius: Radii.large,
            borderWidth: 1,
            gap: Spacing.md,
            maxWidth: 460,
            padding: Spacing.xl,
            width: "100%",
          }}
        >
          <View
            style={{
              alignItems: "center",
              backgroundColor: "rgba(32, 223, 114, 0.14)",
              borderRadius: 24,
              height: 48,
              justifyContent: "center",
              width: 48,
            }}
          >
            <StarIcon color={colors.brand} filled size={25} />
          </View>
          <Text
            style={{
              color: colors.brandLight,
              fontSize: 12,
              fontWeight: "900",
              letterSpacing: 1.1,
              textTransform: "uppercase",
            }}
          >
            Welcome to voting
          </Text>
          <Text style={{ color: colors.text, fontSize: 27, fontWeight: "900" }}>
            Here&apos;s how it works
          </Text>
          <View style={{ gap: Spacing.md }}>
            {[
              [
                "Explore anonymous picks.",
                "You’ll see songs submitted by other players, but not who chose each one.",
              ],
              [
                "Listen first.",
                "Play the available clip or open the song in Spotify.",
              ],
              [
                "Rate the fit.",
                "Choose 1–5 stars based on how well the song matches the prompt.",
              ],
            ].map(([heading, body], index) => (
              <View
                key={heading}
                style={{ flexDirection: "row", gap: Spacing.sm }}
              >
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: colors.brand,
                    borderRadius: 12,
                    height: 24,
                    justifyContent: "center",
                    width: 24,
                  }}
                >
                  <Text
                    style={{
                      color: colors.background,
                      fontSize: 12,
                      fontWeight: "900",
                    }}
                  >
                    {index + 1}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: "800",
                    }}
                  >
                    {heading}
                  </Text>
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: 14,
                      lineHeight: 20,
                    }}
                  >
                    {body}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <Action disabled={saving} onPress={onContinue}>
            {saving ? "Saving…" : "Start voting"}
          </Action>
        </View>
      </View>
    </Modal>
  );
}

export default function VoteScreen() {
  const { id, review } = useLocalSearchParams<{
    id: string;
    review?: string;
  }>();
  const router = useRouter();
  const { refresh: refreshSession } = useAuth();
  const [detail, setDetail] = useState<RoundDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState({
    voted: 0,
    total: 0,
    complete: false,
  });
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [closed, setClosed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [savingGuide, setSavingGuide] = useState(false);
  const [focused, setFocused] = useState(false);
  const modeRef = useRef<"FIRST_PASS" | "EDITING" | null>(null);
  const [mode, setMode] = useState<"FIRST_PASS" | "EDITING" | null>(null);
  const requestInFlight = useRef(false);
  const [transition] = useState(() => new Animated.Value(0));
  const load = useCallback(async () => {
    const roundId = Number(id);
    if (!Number.isInteger(roundId) || roundId < 1) {
      setError(ApiError.fromHttpStatus(404, "This round could not be found."));
      setLoading(false);
      return;
    }
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const next = await getRoundDetail(roundId);
      setDetail(next);
      setScores(next.ballot.saved_scores);
      setProgress({
        voted: next.ballot.voted_count,
        total: next.ballot.eligible_count,
        complete: next.ballot.complete,
      });
      if (modeRef.current === null) {
        const initialMode = next.ballot.complete || review === "1" ? "EDITING" : "FIRST_PASS";
        modeRef.current = initialMode;
        setMode(initialMode);
      }
      setClosed(next.round.state !== "voting");
      setShowGuide(next.show_voting_guide);
      setIndex((current) =>
        Math.min(
          current,
          Math.max(0, (next.ballot.eligible_submissions?.length ?? 1) - 1),
        ),
      );
    } catch (cause) {
      const apiError =
        cause instanceof ApiError
          ? cause
          : ApiError.networkError("Unable to load your ballot.");
      if (apiError.statusCode === 401) await refreshSession();
      else setError(apiError);
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }, [id, refreshSession, review]);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      void load();
      return () => setFocused(false);
    }, [load]),
  );

  const tracks = detail?.ballot.eligible_submissions ?? [];
  const current = tracks[index] ?? null;
  const currentScore = current ? scores[String(current.id)] : undefined;
  const isVoting = detail?.round.state === "voting" && !closed;
  const firstPass = mode === "FIRST_PASS";
  const displayProgress = useMemo(
    () => `${progress.voted} of ${progress.total} rated`,
    [progress],
  );

  const refreshVotingState = useCallback(async () => {
    try {
      const next = await getRoundDetail(Number(id));
      setDetail((current) =>
        current ? { ...current, round: next.round } : next,
      );
      setClosed(next.round.state !== "voting");
      setProgress({
        voted: next.ballot.voted_count,
        total: next.ballot.eligible_count,
        complete: next.ballot.complete,
      });
    } catch (cause) {
      if (cause instanceof ApiError && cause.statusCode === 401)
        await refreshSession();
    }
  }, [id, refreshSession]);

  useLiveRefresh(refreshVotingState, isVoting ? 20000 : null);

  const continueFromGuide = async () => {
    setSavingGuide(true);
    try {
      await acknowledgeVotingGuide();
    } catch {
      /* The web flow dismisses the guide even if acknowledgement fails. */
    }
    setShowGuide(false);
    setSavingGuide(false);
  };

  const transitionToIndex = (nextIndex: number, direction: 1 | -1) => {
    if (nextIndex === index || transitioning) return;
    setTransitioning(true);
    transition.stopAnimation();
    transition.setValue(0);
    Animated.timing(transition, {
      duration: 150,
      easing: Easing.out(Easing.cubic),
      toValue: direction,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        setTransitioning(false);
        return;
      }
      setIndex(nextIndex);
      transition.setValue(-direction);
      Animated.timing(transition, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }).start(() => setTransitioning(false));
    });
  };

  const advanceFirstPass = (nextIndex: number) => {
    transitionToIndex(nextIndex, -1);
  };

  const rate = async (score: number) => {
    if (!current || saving || transitioning || !isVoting) return;
    setSaving(true);
    setError(null);
    try {
      const result = await saveVote(Number(id), current.id, score);
      setScores(result.ballot.saved_scores);
      setProgress({
        voted: result.ballot.voted_count,
        total: result.ballot.eligible_count,
        complete: result.ballot.complete,
      });
      if (result.ballot.complete && firstPass) {
        router.replace(`/round/${id}/vote/complete` as never);
      } else if (firstPass && index < tracks.length - 1) {
        advanceFirstPass(index + 1);
      }
    } catch (cause) {
      const apiError =
        cause instanceof ApiError
          ? cause
          : ApiError.networkError("Your rating could not be saved.");
      if (apiError.statusCode === 401) await refreshSession();
      if (apiError.code === "voting_closed") {
        setClosed(true);
        await load();
      }
      setError(apiError);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !detail)
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
        <Header onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  if (error && !detail)
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
        <Header onBack={() => router.back()} />
        <LockedState
          title="Voting unavailable"
          body={
            error.isNetworkError
              ? "We couldn’t reach QueueUp. Check your connection and try again."
              : error.message
          }
          onRetry={() => void load()}
        />
      </SafeAreaView>
    );
  if (!detail) return null;
  if (!isVoting)
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
        <Header onBack={() => router.back()} />
        <LockedState
          title={
            detail.round.state === "locked"
              ? "Votes are locked"
              : "Voting is closed"
          }
          body={
            detail.round.state === "locked"
              ? "Results are being prepared for this round."
              : "QueueUp is no longer accepting ratings for this round."
          }
        />
      </SafeAreaView>
    );
  if (!tracks.length || detail.ballot.no_votable_songs)
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
        <Header onBack={() => router.back()} />
        <LockedState
          title="Nothing to rate"
          body="There are no eligible songs on your ballot."
        />
      </SafeAreaView>
    );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <Header onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.context}>
          <Text style={styles.eyebrow}>{detail.round.season.name}</Text>
          <Text style={styles.prompt}>{detail.round.prompt}</Text>
          {detail.round.details ? (
            <Text style={styles.body}>{detail.round.details}</Text>
          ) : null}
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.progress}>{displayProgress}</Text>
          <Text style={styles.songNumber}>
            Song {index + 1} of {tracks.length}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress.total ? (progress.voted / progress.total) * 100 : 0}%`,
              },
            ]}
          />
        </View>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: transition.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [0.35, 1, 0.35],
              }),
              transform: [
                {
                  translateX: transition.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [-340, 0, 340],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.anonymous}>ANONYMOUS SONG</Text>
          {focused ? <SpotifyEmbed trackId={current.spotify_track_id} /> : null}
          <Text style={styles.ratePrompt}>
            How well does this fit the prompt?
          </Text>
          <View
            accessibilityLabel="Song rating"
            accessibilityRole="radiogroup"
            style={styles.stars}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable
                key={value}
                accessibilityLabel={`Rate ${value} out of 5`}
                accessibilityRole="radio"
                accessibilityState={{
                  selected: currentScore === value,
                  disabled: saving,
                }}
                disabled={saving}
                onPress={() => void rate(value)}
                style={({ pressed }) => [
                  styles.starButton,
                  pressed && styles.pressed,
                ]}
              >
                <StarIcon
                  color={
                    currentScore !== undefined && value <= currentScore
                      ? colors.brand
                      : colors.textMuted
                  }
                  filled={currentScore !== undefined && value <= currentScore}
                  size={32}
                />
              </Pressable>
            ))}
          </View>
          <Text accessibilityLiveRegion="polite" style={styles.selectedRating}>
            {currentScore
              ? `Your rating: ${currentScore} out of 5`
              : firstPass
                ? "Choose a rating to save and continue."
                : "Choose a rating to save."
            }
          </Text>
          {saving ? <Text style={styles.saving}>Saving rating…</Text> : null}
          {error ? <ErrorMessage message={error.message} /> : null}
        </Animated.View>
        {focused && tracks[index + 1] ? (
          <View pointerEvents="none" style={styles.previewPreload}>
            <SpotifyEmbed trackId={tracks[index + 1].spotify_track_id} />
          </View>
        ) : null}
        <Text style={styles.rule}>
          Rate every song for your ballot to count.
        </Text>
        {!firstPass ? (
          <View style={styles.navigation}>
            <Action
              disabled={index === 0 || saving || transitioning}
              secondary
              onPress={() => transitionToIndex(index - 1, 1)}
            >
              Previous
            </Action>
            <Action
              disabled={index === tracks.length - 1 || saving || transitioning}
              secondary
              onPress={() => transitionToIndex(index + 1, -1)}
            >
              Next
            </Action>
          </View>
        ) : null}
      </ScrollView>
      {showGuide ? (
        <VotingGuideModal
          onContinue={() => void continueFromGuide()}
          saving={savingGuide}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  header: {
    alignItems: "center",
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
  },
  back: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.xs,
    minHeight: 44,
    minWidth: 84,
  },
  backLabel: { color: colors.brandLight, fontSize: 15, fontWeight: "700" },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  headerSpacer: { minWidth: 84 },
  content: {
    alignSelf: "center",
    gap: Spacing.md,
    maxWidth: 560,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    width: "100%",
  },
  context: { gap: Spacing.sm, paddingVertical: Spacing.sm },
  eyebrow: {
    color: colors.brandLight,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  prompt: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.7,
    lineHeight: 32,
  },
  body: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  center: {
    flex: 1,
    gap: Spacing.md,
    justifyContent: "center",
    padding: Spacing.xl,
  },
  lockedTitle: { color: colors.text, fontSize: 24, fontWeight: "900" },
  progressRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progress: { color: colors.brandLight, fontSize: 14, fontWeight: "800" },
  songNumber: { color: colors.textMuted, fontSize: 13 },
  progressTrack: {
    backgroundColor: colors.surfaceHighest,
    borderRadius: 99,
    height: 6,
    overflow: "hidden",
  },
  progressFill: { backgroundColor: colors.brand, borderRadius: 99, height: 6 },
  card: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: Radii.large,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  previewPreload: {
    height: 1,
    opacity: 0,
    overflow: "hidden",
    width: 1,
  },
  anonymous: {
    color: colors.brandLight,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  ratePrompt: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: Spacing.sm,
  },
  stars: {
    flexDirection: "row",
    justifyContent: "center",
    marginHorizontal: -Spacing.xs,
  },
  starButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    minWidth: 52,
    padding: Spacing.xs,
  },
  selectedRating: {
    color: colors.textMuted,
    fontSize: 13,
    minHeight: 20,
    textAlign: "center",
  },
  saving: { color: colors.brandLight, fontSize: 12, fontWeight: "700" },
  rule: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
  navigation: {
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
  },
  complete: {
    backgroundColor: "rgba(32, 223, 114, 0.08)",
    borderColor: "rgba(32, 223, 114, 0.25)",
    borderRadius: Radii.medium,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  completeTitle: { color: colors.brandLight, fontSize: 20, fontWeight: "900" },
  pressed: { opacity: 0.72 },
});
