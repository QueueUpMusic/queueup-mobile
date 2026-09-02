import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Action, ErrorMessage } from "@/components/auth-ui";
import { ArrowRight, ChevronLeft, ShareIcon } from "@/components/queueup-icon";
import { colors, Radii, Spacing } from "@/constants/theme";
import { resolveServerUrl } from "@/config/server";
import { getSeasonRecap } from "@/lib/api";
import { ApiError, RecapSlide, RecapSong, SeasonRecapResponse } from "@/types";

const queueUpIcon = require("../../../../assets/images/queueup-icon.png");

function Artwork({
  song,
  size = 180,
}: {
  song: RecapSong | null;
  size?: number;
}) {
  const uri = resolveServerUrl(song?.album_art_url ?? song?.art ?? null);
  return uri ? (
    <Image
      accessibilityLabel={`${song?.album ?? "Song"} artwork`}
      source={{ uri }}
      style={{ borderRadius: Radii.medium, height: size, width: size }}
    />
  ) : (
    <View style={[styles.artFallback, { height: size, width: size }]}>
      <Text style={styles.artNote}>♪</Text>
    </View>
  );
}

function SongHighlight({ song }: { song: RecapSong }) {
  return (
    <View style={styles.songHighlight}>
      <Artwork song={song} size={174} />
      <Text style={styles.songTitle}>{song.title}</Text>
      <Text style={styles.songArtist}>{song.artist}</Text>
      {song.album ? <Text style={styles.songAlbum}>{song.album}</Text> : null}
    </View>
  );
}

function Slide({
  onShare,
  seasonName,
  slide,
}: {
  onShare?: () => void;
  seasonName: string;
  slide: RecapSlide;
}) {
  switch (slide.kind) {
    case "intro":
      return (
        <>
          <Text style={styles.kicker}>Your QueueUp season</Text>
          <Text style={styles.heroTitle}>{seasonName}</Text>
          <Text style={styles.display}>
            {slide.round_count} rounds.{"\n"}
            {slide.song_count} songs.{"\n"}
            <Text style={styles.emphasis}>One season.</Text>
          </Text>
        </>
      );
    case "standing":
      return (
        <>
          <Text style={styles.kicker}>Final standing</Text>
          <Text style={styles.overline}>You finished</Text>
          <Text style={styles.giant}>#{slide.place}</Text>
          <Text style={styles.lede}>
            of {slide.league_size} players · {slide.points} points
          </Text>
          <View style={styles.statRow}>
            {slide.podiums ? (
              <Stat value={slide.podiums} label="podiums" />
            ) : null}
            {slide.wins ? <Stat value={slide.wins} label="wins" /> : null}
            <Stat
              value={`${slide.top_half}/${slide.played}`}
              label="top half"
            />
          </View>
        </>
      );
    case "best_submission":
      return (
        <>
          <Text style={styles.kicker}>Your biggest hit</Text>
          <SongHighlight song={slide.song} />
          <View style={styles.callout}>
            <Text style={styles.calloutBig}>{slide.song.place_label}</Text>
            <Text style={styles.calloutText}>
              {slide.song.average} ★ counted average
            </Text>
          </View>
        </>
      );
    case "taste":
      return (
        <>
          <Text style={styles.kicker}>Your voting taste</Text>
          <Text style={styles.slideNote}>
            Based on the songs you rated this season.
          </Text>
          {slide.favorite_artist ? (
            <View style={styles.textStat}>
              <Text style={styles.label}>Artist you rated highest</Text>
              <Text style={styles.statHeading}>{slide.favorite_artist}</Text>
            </View>
          ) : null}
          {slide.favorite_genre ? (
            <View style={styles.textStat}>
              <Text style={styles.label}>Genre you rated highest</Text>
              <Text style={styles.statHeading}>{slide.favorite_genre}</Text>
            </View>
          ) : null}
          {slide.song ? (
            <>
              <Text style={[styles.label, styles.songOfSeasonLabel]}>
                Your highest-rated song
              </Text>
              <SongHighlight song={slide.song} />
            </>
          ) : null}
        </>
      );
    case "voting":
      return (
        <>
          <Text style={styles.kicker}>Voting personality</Text>
          <Text style={styles.overline}>You gave an average of</Text>
          <Text style={styles.giant}>
            {slide.average}
            <Text style={styles.giantSuffix}> ★</Text>
          </Text>
          {slide.league_average !== null ? (
            <Text style={styles.lede}>
              League average: {slide.league_average} ★
            </Text>
          ) : null}
          <View style={styles.statRow}>
            <Stat value={slide.ratings} label="counted ratings" />
            <Stat value={slide.five_stars} label="five-star picks" />
          </View>
          {slide.personality ? (
            <Text style={styles.personality}>{slide.personality}</Text>
          ) : null}
        </>
      );
    case "story":
      return (
        <>
          <Text style={styles.kicker}>Your season story</Text>
          <Text style={styles.overline}>Your best finish was</Text>
          <Text style={styles.storyTitle}>{slide.best_finish}</Text>
          <Text style={styles.lede}>in “{slide.round_prompt}”</Text>
          <Text style={styles.displaySmall}>
            You landed in the top half in {slide.top_half} of {slide.played}{" "}
            rounds.
          </Text>
        </>
      );
    case "chaos":
      return (
        <>
          <Text style={styles.kicker}>The chaos card</Text>
          <Text style={styles.overline}>Your most divisive pick</Text>
          <SongHighlight song={slide.song} />
          <Text style={styles.lede}>
            {slide.song.low}–{slide.song.high} ★ spread from counted ballots.
          </Text>
        </>
      );
    case "league":
      return (
        <>
          <Text style={styles.kicker}>The league season</Text>
          <View style={styles.leagueStats}>
            <Stat value={slide.song_count} label="songs submitted" />
            <Stat value={slide.rating_count} label="counted ratings" />
            <Stat value={slide.round_count} label="rounds played" />
          </View>
          {slide.top_song ? (
            <>
              <Text style={styles.overline}>Season&apos;s top song</Text>
              <Text style={styles.statHeading}>{slide.top_song.title}</Text>
              <Text style={styles.lede}>
                {slide.top_song.artist} · {slide.top_song.average} ★ average
              </Text>
            </>
          ) : null}
        </>
      );
    case "summary":
      return (
        <>
          <Text style={styles.kicker}>QueueUp season recap</Text>
          {slide.standing ? (
            <>
              <Text style={styles.storyTitle}>
                #{slide.standing.place} overall
              </Text>
              <Text style={styles.lede}>{slide.standing.score} points</Text>
            </>
          ) : null}
          <View style={styles.summary}>
            <SummaryItem
              label="Song of the season"
              value={slide.song_of_season?.title}
            />
            <SummaryItem
              label="Favorite artist"
              value={slide.favorite_artist}
            />
            <SummaryItem
              label="Best submission"
              value={slide.best_submission?.title}
            />
          </View>
          <Text style={styles.thanks}>
            {slide.podiums} podiums · {slide.wins} wins · {slide.round_count}{" "}
            rounds played{`\n`}Thanks for playing.
          </Text>
          {onShare ? (
            <Pressable
              accessibilityLabel="Share your season recap"
              accessibilityRole="button"
              onPress={onShare}
              style={({ pressed }) => [
                styles.shareButton,
                pressed && styles.controlPressed,
              ]}
            >
              <ShareIcon color="#24113b" size={18} />
              <Text style={styles.shareButtonText}>Share your recap</Text>
            </Pressable>
          ) : null}
        </>
      );
  }
}

function findSlide<K extends RecapSlide["kind"]>(
  slides: RecapSlide[],
  kind: K,
): Extract<RecapSlide, { kind: K }> | undefined {
  return slides.find(
    (slide): slide is Extract<RecapSlide, { kind: K }> => slide.kind === kind,
  );
}

function ShareCard({
  recap,
  cardRef,
}: {
  recap: SeasonRecapResponse;
  cardRef: RefObject<View | null>;
}) {
  const intro = findSlide(recap.slides, "intro");
  const standing = findSlide(recap.slides, "standing");
  return (
    <View ref={cardRef} collapsable={false} style={styles.shareCard}>
      <View style={[styles.shareOrb, styles.shareOrbTop]} />
      <View style={[styles.shareOrb, styles.shareOrbBottom]} />
      <Text style={styles.shareKicker}>QUEUEUP SEASON RECAP</Text>
      <Text numberOfLines={2} style={styles.shareSeason}>
        {recap.season.name}
      </Text>
      {standing ? (
        <>
          <Text style={styles.sharePlace}>#{standing.place}</Text>
          <Text style={styles.shareMuted}>
            final place · {standing.points} points
          </Text>
        </>
      ) : null}
      <View style={styles.shareStats}>
        <ShareStat
          label="Rounds played"
          value={
            intro?.round_count ??
            findSlide(recap.slides, "league")?.round_count ??
            recap.summary.round_count
          }
        />
        <ShareStat label="Songs submitted" value={intro?.song_count ?? 0} />
        <ShareStat label="Podiums" value={recap.summary.podiums} />
        <ShareStat label="Wins" value={recap.summary.wins} />
      </View>
      {recap.summary.favorite_artist ? (
        <View style={styles.shareHighlight}>
          <Text style={styles.shareLabel}>FAVORITE ARTIST</Text>
          <Text numberOfLines={2} style={styles.shareValue}>
            {recap.summary.favorite_artist}
          </Text>
        </View>
      ) : null}
      {recap.summary.song_of_season ? (
        <View style={styles.shareHighlight}>
          <Text style={styles.shareLabel}>SONG OF THE SEASON</Text>
          <Text numberOfLines={2} style={styles.shareValue}>
            {recap.summary.song_of_season.title}
          </Text>
          <Text numberOfLines={1} style={styles.shareMuted}>
            {recap.summary.song_of_season.artist}
          </Text>
        </View>
      ) : null}
      <Image accessibilityLabel="QueueUp" source={queueUpIcon} style={styles.shareBrandIcon} />
    </View>
  );
}

function ShareStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <View style={styles.shareStat}>
      <Text style={styles.shareStatValue}>{value}</Text>
      <Text style={styles.shareMuted}>{label}</Text>
    </View>
  );
}

const slideColors: Record<RecapSlide["kind"], string> = {
  intro: "#241040",
  standing: "#102a4a",
  best_submission: "#3d174e",
  taste: "#173d35",
  voting: "#452019",
  story: "#243b64",
  chaos: "#4a1e31",
  league: "#1e2854",
  summary: "#3b164f",
};

type OrbAnchor = "left" | "center" | "right";
type AmbientConfig = {
  top: string;
  bottom: string;
  topAnchor: OrbAnchor;
  bottomAnchor: OrbAnchor;
  topEntrance: number;
  bottomEntrance: number;
  topPath: number[];
  bottomPath: number[];
  durations: number[];
};

const ambientConfigs: Record<RecapSlide["kind"], AmbientConfig> = {
  intro: {
    top: "#f65e95",
    bottom: "#6859e8",
    topAnchor: "left",
    bottomAnchor: "right",
    topEntrance: -1,
    bottomEntrance: 1,
    topPath: [0.42, -0.28, 0.55, 0],
    bottomPath: [-0.4, 0.3, -0.55, 0],
    durations: [10000, 13000, 11500, 14500],
  },
  standing: {
    top: "#f5a623",
    bottom: "#3bd6c6",
    topAnchor: "center",
    bottomAnchor: "left",
    topEntrance: 1,
    bottomEntrance: -1,
    topPath: [-0.5, 0.3, -0.18, 0],
    bottomPath: [0.52, -0.36, 0.24, 0],
    durations: [12500, 10500, 14500, 12000],
  },
  best_submission: {
    top: "#ff6b9e",
    bottom: "#7d7cff",
    topAnchor: "right",
    bottomAnchor: "center",
    topEntrance: -1,
    bottomEntrance: -1,
    topPath: [0.55, 0.18, -0.42, 0],
    bottomPath: [-0.3, 0.5, 0.12, 0],
    durations: [9000, 14500, 12000, 15500],
  },
  taste: {
    top: "#ffcb6b",
    bottom: "#32c48d",
    topAnchor: "left",
    bottomAnchor: "center",
    topEntrance: 1,
    bottomEntrance: 1,
    topPath: [-0.26, 0.52, -0.48, 0],
    bottomPath: [0.46, -0.24, 0.56, 0],
    durations: [11500, 15000, 9500, 13500],
  },
  voting: {
    top: "#67d7ff",
    bottom: "#ff7c93",
    topAnchor: "center",
    bottomAnchor: "right",
    topEntrance: -1,
    bottomEntrance: 1,
    topPath: [0.22, -0.55, 0.4, 0],
    bottomPath: [-0.52, 0.2, -0.28, 0],
    durations: [14000, 10000, 15500, 11500],
  },
  story: {
    top: "#ffcf5a",
    bottom: "#9e79ff",
    topAnchor: "right",
    bottomAnchor: "left",
    topEntrance: 1,
    bottomEntrance: -1,
    topPath: [-0.52, 0.34, -0.22, 0],
    bottomPath: [0.3, -0.5, 0.4, 0],
    durations: [10500, 13500, 15000, 11000],
  },
  chaos: {
    top: "#7be0c3",
    bottom: "#ff9868",
    topAnchor: "left",
    bottomAnchor: "right",
    topEntrance: -1,
    bottomEntrance: 1,
    topPath: [0.46, -0.32, 0.54, 0],
    bottomPath: [-0.44, 0.36, -0.14, 0],
    durations: [13000, 15500, 10000, 14500],
  },
  league: {
    top: "#f181ff",
    bottom: "#48e0ff",
    topAnchor: "center",
    bottomAnchor: "center",
    topEntrance: 1,
    bottomEntrance: 1,
    topPath: [-0.36, 0.48, -0.55, 0],
    bottomPath: [0.5, -0.26, 0.34, 0],
    durations: [9500, 14000, 12500, 16000],
  },
  summary: {
    top: "#ffdf70",
    bottom: "#6ee7b7",
    topAnchor: "right",
    bottomAnchor: "left",
    topEntrance: -1,
    bottomEntrance: -1,
    topPath: [0.52, -0.2, 0.3, 0],
    bottomPath: [-0.34, 0.54, -0.44, 0],
    durations: [12000, 9500, 15000, 13000],
  },
};

const orbAnchors = {
  top: {
    left: { left: -120, top: -105 },
    center: { left: "50%", marginLeft: -215, top: -105 },
    right: { right: -120, top: -105 },
  },
  bottom: {
    left: { bottom: -135, left: -115 },
    center: { bottom: -135, left: "50%", marginLeft: -180 },
    right: { bottom: -135, right: -115 },
  },
} as const;

function RecapAmbient({
  kind,
  slideIndex,
  width,
  opacity,
  visible,
}: {
  kind: RecapSlide["kind"];
  slideIndex: number;
  width: number;
  opacity: Animated.AnimatedInterpolation<number>;
  visible: boolean;
}) {
  const [topMotion] = useState(() => new Animated.Value(0));
  const [bottomMotion] = useState(() => new Animated.Value(0));
  const config = ambientConfigs[kind];

  useEffect(() => {
    if (!visible) return;
    topMotion.setValue(config.topEntrance);
    bottomMotion.setValue(config.bottomEntrance);
    const topEntrance = Animated.timing(topMotion, {
      duration: 1200,
      toValue: 0,
      useNativeDriver: true,
    });
    const bottomEntrance = Animated.timing(bottomMotion, {
      duration: 1450,
      toValue: 0,
      useNativeDriver: true,
    });
    const topAmbient = Animated.loop(
      Animated.sequence(
        config.topPath.map((toValue, i) =>
          Animated.timing(topMotion, {
            duration: config.durations[i],
            toValue,
            useNativeDriver: true,
          }),
        ),
      ),
    );
    const bottomAmbient = Animated.loop(
      Animated.sequence(
        config.bottomPath.map((toValue, i) =>
          Animated.timing(bottomMotion, {
            duration: config.durations[(i + 1) % config.durations.length],
            toValue,
            useNativeDriver: true,
          }),
        ),
      ),
    );
    Animated.parallel([topEntrance, bottomEntrance]).start(({ finished }) => {
      if (finished) {
        topAmbient.start();
        bottomAmbient.start();
      }
    });
    return () => {
      topEntrance.stop();
      bottomEntrance.stop();
      topAmbient.stop();
      bottomAmbient.stop();
      topMotion.stopAnimation();
      bottomMotion.stopAnimation();
    };
  }, [config, slideIndex, topMotion, bottomMotion, visible]);

  const orbA = {
    transform: [
      {
        translateX: topMotion.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-width * 0.12, 0, width * 0.12],
        }),
      },
      {
        translateY: topMotion.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [width * 0.08, 0, -width * 0.08],
        }),
      },
      {
        scale: topMotion.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [0.92, 1, 1.1],
        }),
      },
      {
        rotate: topMotion.interpolate({
          inputRange: [-1, 1],
          outputRange: ["-8deg", "10deg"],
        }),
      },
    ],
  };
  const orbB = {
    transform: [
      {
        translateX: bottomMotion.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-width * 0.1, 0, width * 0.1],
        }),
      },
      {
        translateY: bottomMotion.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-width * 0.07, 0, width * 0.07],
        }),
      },
      {
        scale: bottomMotion.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [0.94, 1, 1.08],
        }),
      },
      {
        rotate: bottomMotion.interpolate({
          inputRange: [-1, 1],
          outputRange: ["8deg", "-10deg"],
        }),
      },
    ],
  };

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ambientLayer, { backgroundColor: slideColors[kind], opacity }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbA,
          orbAnchors.top[config.topAnchor],
          { backgroundColor: config.top },
          orbA,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbB,
          orbAnchors.bottom[config.bottomAnchor],
          { backgroundColor: config.bottom },
          orbB,
        ]}
      />
      <View pointerEvents="none" style={styles.grid}>
        <View style={styles.gridLineVertical} />
        <View style={styles.gridLineHorizontal} />
      </View>
    </Animated.View>
  );
}

function RecapSlideFrame({
  active,
  onShare,
  seasonName,
  slide,
  opacity,
  width,
}: {
  active: boolean;
  onShare?: () => void;
  seasonName: string;
  slide: RecapSlide;
  opacity: Animated.AnimatedInterpolation<number>;
  width: number;
}) {
  const [entrance] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!active) return;
    entrance.setValue(0);
    Animated.timing(entrance, {
      duration: 520,
      toValue: 1,
      useNativeDriver: true,
    }).start();
    return () => entrance.stopAnimation();
  }, [active, entrance]);
  const copyStyle = {
    opacity,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };
  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={[styles.slideInner, copyStyle]}>
        <Slide onShare={onShare} seasonName={seasonName} slide={slide} />
      </Animated.View>
    </View>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function SummaryItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return value ? (
    <View style={styles.summaryItem}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  ) : null;
}

export default function RecapScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const [recap, setRecap] = useState<SeasonRecapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [index, setIndex] = useState(0);
  const [shareUri, setShareUri] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const listRef = useRef<FlatList<RecapSlide>>(null);
  const [scrollX] = useState(() => new Animated.Value(0));
  const shareCardRef = useRef<View>(null);
  const requestInFlight = useRef(false);
  const load = useCallback(async () => {
    if (!id || requestInFlight.current) return;
    requestInFlight.current = true;
    setError(null);
    try {
      setRecap(await getSeasonRecap(Number(id)));
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause
          : ApiError.networkError("Unable to load your recap."),
      );
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const prepareShare = useCallback(async () => {
    if (!recap || !shareCardRef.current || sharing) return;
    setSharing(true);
    setShareError(null);
    try {
      setShareUri(
        await captureRef(shareCardRef, {
          format: "png",
          quality: 0.95,
          result: "tmpfile",
        }),
      );
    } catch {
      setShareError("We couldn’t prepare your recap image. Please try again.");
    } finally {
      setSharing(false);
    }
  }, [recap, sharing]);
  const shareImage = useCallback(async () => {
    if (!shareUri) return;
    if (!(await Sharing.isAvailableAsync())) {
      setShareError("Image sharing is not available on this device.");
      return;
    }
    await Sharing.shareAsync(shareUri, {
      dialogTitle: "Share your QueueUp recap",
      mimeType: "image/png",
      UTI: "public.png",
    });
  }, [shareUri]);

  if (loading && !recap)
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  if (error && !recap)
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>
            {error.code === "recap_unavailable"
              ? "Recap unavailable"
              : "Your recap is taking a moment"}
          </Text>
          <ErrorMessage
            message={
              error.code === "recap_unavailable"
                ? error.message
                : "We couldn’t load your season recap right now."
            }
          />
          <Action
            onPress={() => {
              setLoading(true);
              void load();
            }}
          >
            Try again
          </Action>
          <Action secondary onPress={() => router.back()}>
            Back to archive
          </Action>
        </View>
      </SafeAreaView>
    );
  if (!recap) return null;
  const slides = recap.slides;
  const go = (next: number) => {
    if (next >= 0 && next < slides.length) {
      setIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    }
  };
  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[
        styles.screen,
        { backgroundColor: slideColors[slides[index].kind] },
      ]}
    >
      <View pointerEvents="none" style={styles.ambientLayer}>
        {slides.map((slide, slideIndex) => (
          <RecapAmbient
            key={`${slide.kind}-${slideIndex}`}
            kind={slide.kind}
            slideIndex={slideIndex}
            width={width}
            visible={Math.abs(slideIndex - index) <= 1}
            opacity={scrollX.interpolate({
              inputRange: [
                (slideIndex - 1) * width,
                (slideIndex - 0.5) * width,
                slideIndex * width,
                (slideIndex + 0.5) * width,
                (slideIndex + 1) * width,
              ],
              outputRange: [0, 0, 1, 0, 0],
              extrapolate: "clamp",
            })}
          />
        ))}
      </View>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back to archive"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}
        >
          <ChevronLeft color={colors.text} size={25} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {recap.season.name}
        </Text>
        <Text
          style={styles.headerCount}
          accessibilityLabel={`Recap slide ${index + 1} of ${slides.length}`}
        >
          {index + 1} / {slides.length}
        </Text>
      </View>
      <View style={styles.progress}>
        {slides.map((slide, i) => (
          <View
            key={`${slide.kind}-${i}`}
            style={[styles.progressDot, i === index && styles.progressActive]}
          />
        ))}
      </View>
      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={0}
        keyExtractor={(_, i) => String(i)}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ index: slideIndex, item }) => (
            <RecapSlideFrame
              active={Math.abs(slideIndex - index) <= 1}
              onShare={item.kind === "summary" ? prepareShare : undefined}
              seasonName={recap.season.name}
              slide={item}
              opacity={scrollX.interpolate({
                inputRange: [
                  (slideIndex - 1) * width,
                  slideIndex * width,
                  (slideIndex + 1) * width,
                ],
                outputRange: [0, 1, 0],
                extrapolate: "clamp",
              })}
              width={width}
            />
        )}
      />
      <View pointerEvents="none" style={styles.shareCardHost}>
        <ShareCard cardRef={shareCardRef} recap={recap} />
      </View>
      <View style={styles.controls}>
        <Pressable
          accessibilityLabel="Previous recap slide"
          accessibilityRole="button"
          disabled={index === 0}
          onPress={() => go(index - 1)}
          style={[styles.control, index === 0 && styles.controlDisabled]}
        >
          <Text style={styles.controlText}>Back</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={
            index === slides.length - 1 ? "Finish recap" : "Next recap slide"
          }
          accessibilityRole="button"
          onPress={() =>
            index === slides.length - 1 ? router.back() : go(index + 1)
          }
          style={[styles.control, styles.nextControl]}
        >
          <Text style={styles.nextText}>
            {index === slides.length - 1 ? "Done" : "Next"}
          </Text>
          {index < slides.length - 1 ? (
            <ArrowRight color={colors.background} size={17} />
          ) : null}
        </Pressable>
      </View>
      <Modal
        animationType="slide"
        transparent
        visible={Boolean(shareUri || shareError || sharing)}
        onRequestClose={() => {
          setShareUri(null);
          setShareError(null);
        }}
      >
        <View style={styles.shareModalBackdrop}>
          <View style={styles.shareModal}>
            <Text style={styles.shareModalTitle}>Share your recap</Text>
            <Text style={styles.shareModalCopy}>
              A snapshot of your QueueUp season.
            </Text>
            {shareUri ? (
              <Image
                accessibilityLabel="Preview of your season recap image"
                source={{ uri: shareUri }}
                style={styles.sharePreview}
              />
            ) : null}
            {sharing ? <ActivityIndicator color={colors.brand} /> : null}
            {shareError ? (
              <Text style={styles.shareError}>{shareError}</Text>
            ) : null}
            {shareUri ? (
              <Pressable
                accessibilityLabel="Share recap image"
                accessibilityRole="button"
                disabled={sharing}
                onPress={() => void shareImage()}
                style={({ pressed }) => [
                  styles.shareModalButton,
                  pressed && styles.controlPressed,
                  sharing && styles.controlDisabled,
                ]}
              >
                <ShareIcon color="#24113b" size={18} />
                <Text style={styles.shareButtonText}>Share image</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel="Close share menu"
              accessibilityRole="button"
              onPress={() => {
                setShareUri(null);
                setShareError(null);
              }}
              style={styles.shareCancel}
            >
              <Text style={styles.controlText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1, overflow: "hidden" },
  center: { flex: 1, justifyContent: "center", padding: Spacing.xl },
  ambientLayer: {
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    zIndex: 2,
  },
  headerTitle: {
    color: "#fff",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    marginHorizontal: Spacing.md,
    textAlign: "center",
  },
  headerCount: {
    color: "rgba(255,255,255,.76)",
    fontSize: 12,
    fontWeight: "700",
    minWidth: 35,
    textAlign: "right",
  },
  progress: {
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    zIndex: 2,
  },
  progressDot: {
    backgroundColor: "rgba(255,255,255,.28)",
    borderRadius: 99,
    flex: 1,
    height: 4,
  },
  progressActive: { backgroundColor: "#fff" },
  slide: { flex: 1, justifyContent: "center" },
  slideInner: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
    zIndex: 2,
  },
  orb: { borderRadius: 999, opacity: 0.78, position: "absolute" },
  orbA: { height: 430, width: 430 },
  orbB: { height: 360, width: 360 },
  grid: {
    bottom: 0,
    left: 0,
    opacity: 0.1,
    position: "absolute",
    right: 0,
    top: 0,
  },
  gridLineVertical: {
    backgroundColor: "rgba(255,255,255,.32)",
    height: "100%",
    left: "52%",
    position: "absolute",
    width: 1,
  },
  gridLineHorizontal: {
    backgroundColor: "rgba(255,255,255,.32)",
    height: 1,
    position: "absolute",
    top: "48%",
    width: "100%",
  },
  gridLineDiagonal: {
    backgroundColor: "rgba(255,255,255,.16)",
    height: "140%",
    left: "50%",
    position: "absolute",
    top: "-20%",
    transform: [{ rotate: "35deg" }],
    width: 1,
  },
  kicker: {
    color: "#ffdf70",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.3,
    textAlign: "center",
    textTransform: "uppercase",
  },
  slideNote: {
    color: "rgba(255,255,255,.72)",
    fontSize: 13,
    lineHeight: 19,
    marginTop: -Spacing.xs,
    textAlign: "center",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 54,
    fontWeight: "900",
    letterSpacing: -2,
    lineHeight: 57,
    maxWidth: 330,
    textAlign: "center",
  },
  display: {
    color: "rgba(255,255,255,.82)",
    fontSize: 23,
    fontWeight: "700",
    lineHeight: 34,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  emphasis: { color: "#ffdf70" },
  overline: {
    color: "rgba(255,255,255,.76)",
    fontSize: 15,
    fontWeight: "700",
    marginTop: Spacing.md,
    textAlign: "center",
  },
  giant: {
    color: "#fff",
    fontSize: 82,
    fontWeight: "900",
    letterSpacing: -3,
    lineHeight: 92,
    textAlign: "center",
  },
  giantSuffix: { color: "#ffdc68", fontSize: 36 },
  lede: {
    color: "rgba(255,255,255,.82)",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  statRow: {
    flexDirection: "row",
    gap: Spacing.xl,
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
  stat: { alignItems: "center", minWidth: 72 },
  statValue: { color: "#fff", fontSize: 27, fontWeight: "900" },
  statLabel: {
    color: "rgba(255,255,255,.72)",
    fontSize: 11,
    marginTop: 2,
    textAlign: "center",
  },
  artFallback: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,.14)",
    borderRadius: Radii.medium,
    justifyContent: "center",
  },
  artNote: { color: "#ffdf70", fontSize: 54 },
  songHighlight: { alignItems: "center", gap: 3, marginVertical: Spacing.sm },
  songTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginTop: Spacing.sm,
    maxWidth: 310,
    textAlign: "center",
  },
  songArtist: {
    color: "rgba(255,255,255,.76)",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  songAlbum: {
    color: "rgba(255,255,255,.7)",
    fontSize: 13,
    textAlign: "center",
  },
  callout: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,.14)",
    borderRadius: Radii.small,
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  calloutBig: { color: "#ffdf70", fontSize: 18, fontWeight: "900" },
  calloutText: { color: "rgba(255,255,255,.78)", fontSize: 13 },
  textStat: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,.12)",
    borderRadius: Radii.small,
    padding: Spacing.md,
    width: "100%",
  },
  label: {
    color: "rgba(255,255,255,.72)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  statHeading: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "900",
    marginTop: 3,
    textAlign: "center",
  },
  songOfSeasonLabel: { marginTop: Spacing.sm },
  personality: {
    backgroundColor: "#ffdf70",
    borderRadius: Radii.small,
    color: "#24113b",
    fontSize: 18,
    fontWeight: "800",
    marginTop: Spacing.md,
    overflow: "hidden",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  displaySmall: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 29,
    marginTop: Spacing.xl,
    textAlign: "center",
  },
  storyTitle: {
    color: "#fff",
    fontSize: 39,
    fontWeight: "900",
    lineHeight: 45,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  leagueStats: {
    flexDirection: "row",
    gap: Spacing.lg,
    justifyContent: "center",
    marginVertical: Spacing.xl,
  },
  summary: {
    backgroundColor: "rgba(255,255,255,.13)",
    borderRadius: Radii.medium,
    gap: Spacing.md,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    width: "100%",
  },
  summaryItem: { gap: Spacing.md },
  summaryValue: { color: "#fff", fontSize: 17, fontWeight: "800" },
  thanks: {
    color: "#ffdf70",
    fontSize: 15,
    lineHeight: 24,
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  control: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,.38)",
    borderRadius: Radii.small,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 110,
    paddingHorizontal: Spacing.lg,
  },
  nextControl: {
    backgroundColor: "#ffdf70",
    borderColor: "#ffdf70",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  controlDisabled: { opacity: 0.35 },
  controlText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  nextText: { color: "#24113b", fontSize: 15, fontWeight: "900" },
  errorTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: Spacing.sm,
  },
  shareCardHost: { left: -1000, position: "absolute", top: 0 },
  shareCard: {
    backgroundColor: "#3b164f",
    height: 600,
    overflow: "hidden",
    padding: 30,
    width: 520,
  },
  shareOrb: { borderRadius: 999, opacity: 0.8, position: "absolute" },
  shareOrbTop: {
    backgroundColor: "#ffdf70",
    height: 260,
    right: -80,
    top: -85,
    width: 260,
  },
  shareOrbBottom: {
    backgroundColor: "#6ee7b7",
    bottom: -90,
    height: 240,
    left: -75,
    width: 240,
  },
  shareKicker: {
    color: "#ffdf70",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginTop: 4,
  },
  shareSeason: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
    marginTop: 18,
    maxWidth: 450,
  },
  sharePlace: {
    color: "#fff",
    fontSize: 74,
    fontWeight: "900",
    lineHeight: 78,
    marginTop: 20,
  },
  shareMuted: { color: "rgba(255,255,255,.76)", fontSize: 13, lineHeight: 18 },
  shareStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 25,
  },
  shareStat: {
    backgroundColor: "rgba(255,255,255,.14)",
    borderRadius: 14,
    minWidth: 220,
    padding: 12,
  },
  shareStatValue: { color: "#fff", fontSize: 24, fontWeight: "900" },
  shareLabel: {
    color: "#ffdf70",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  shareHighlight: {
    backgroundColor: "rgba(255,255,255,.13)",
    borderRadius: 14,
    marginTop: 14,
    padding: 12,
  },
  shareValue: { color: "#fff", fontSize: 16, fontWeight: "800", marginTop: 5 },
  shareFooter: { color: "rgba(255,255,255,.8)", fontSize: 13, marginTop: 17 },
  shareBrandIcon: {
    backgroundColor: "#07100c",
    borderRadius: 12,
    bottom: 24,
    height: 42,
    position: "absolute",
    right: 30,
    width: 42,
  },
  shareModalBackdrop: {
    backgroundColor: "rgba(0,0,0,.7)",
    flex: 1,
    justifyContent: "flex-end",
  },
  shareModal: {
    alignItems: "center",
    backgroundColor: "#111a16",
    borderTopLeftRadius: Radii.large,
    borderTopRightRadius: Radii.large,
    gap: Spacing.sm,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  shareModalTitle: { color: colors.text, fontSize: 22, fontWeight: "900" },
  shareModalCopy: { color: colors.textMuted, fontSize: 14 },
  sharePreview: {
    borderRadius: Radii.small,
    height: 265,
    marginVertical: Spacing.sm,
    width: 230,
  },
  shareModalButton: {
    alignItems: "center",
    backgroundColor: "#ffdf70",
    borderRadius: Radii.small,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.xl,
    width: "100%",
  },
  shareButtonText: { color: "#24113b", fontSize: 15, fontWeight: "900" },
  shareCancel: {
    alignItems: "center",
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  shareError: { color: colors.danger, fontSize: 13, textAlign: "center" },
  controlPressed: { opacity: 0.76 },
  shareButton: {
    alignItems: "center",
    backgroundColor: "#ffdf70",
    borderRadius: Radii.small,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: Spacing.lg,
    width: "100%",
  },
});
