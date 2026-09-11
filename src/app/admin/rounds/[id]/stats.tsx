import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Action, ErrorMessage } from "@/components/auth-ui";
import { ChevronLeft } from "@/components/queueup-icon";
import { colors, Radii, Spacing } from "@/constants/theme";
import { getStaffRoundStatus } from "@/lib/api";
import { ApiError, StaffRoundStatus } from "@/types";
import { ProfileLink } from "@/components/profile-link";
export default function RoundStatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<StaffRoundStatus | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(
    async (pull = false) => {
      if (pull) setRefreshing(true);
      try {
        setData(await getStaffRoundStatus(Number(id)));
        setError(null);
      } catch (cause) {
        setError(
          cause instanceof ApiError
            ? cause
            : ApiError.networkError("Unable to load round stats."),
        );
      } finally {
        setRefreshing(false);
      }
    },
    [id],
  );
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <ChevronLeft color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Round stats</Text>
        <View style={styles.spacer} />
      </View>
      {!data && !error ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : !data ? (
        <View style={styles.center}>
          <Text style={styles.title}>Stats are taking a moment</Text>
          <ErrorMessage message={error?.message} />
          <Action onPress={() => void load()}>Try again</Action>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              colors={[colors.brand]}
              onRefresh={() => void load(true)}
              refreshing={refreshing}
            />
          }
        >
          <Text style={styles.kicker}>Staff only</Text>
          <Text style={styles.title}>Player status</Text>
          <View style={styles.metrics}>
            <View>
              <Text style={styles.metric}>{data.player_count}</Text>
              <Text style={styles.meta}>Players</Text>
            </View>
            <View>
              <Text style={styles.metric}>{data.submitted_count}</Text>
              <Text style={styles.meta}>Submitted</Text>
            </View>
            <View>
              <Text style={styles.metric}>{data.completed_count}</Text>
              <Text style={styles.meta}>Voting complete</Text>
            </View>
          </View>
          {data.players.map((player) => (
            <View key={player.id} style={styles.card}>
              <ProfileLink displayName={player.display_name} style={styles.name} username={player.username} />
              <Text style={styles.meta}>
                @{player.username}
                {player.submitted ? " · Submitted" : " · Not submitted"} ·{" "}
                {player.voted_count}/{player.eligible_count} voted
                {player.voting_complete ? " · Complete" : ""}
              </Text>
              {player.submission ? (
                <Text style={styles.song}>
                  {player.submission.title} — {player.submission.artist}
                </Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  header: {
    alignItems: "center",
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  spacer: { width: 24 },
  center: { flex: 1, justifyContent: "center", padding: Spacing.xl },
  content: {
    alignSelf: "center",
    gap: Spacing.md,
    maxWidth: 800,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    width: "100%",
  },
  kicker: {
    color: colors.brandLight,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  title: { color: colors.text, fontSize: 30, fontWeight: "900" },
  metrics: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: Radii.small,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  metric: { color: colors.text, fontSize: 26, fontWeight: "900" },
  meta: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: Radii.small,
    borderWidth: 1,
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: "800" },
  song: { color: colors.brandLight, fontSize: 13 },
});
