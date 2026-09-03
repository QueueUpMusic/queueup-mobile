import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet as NativeStyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AdminReadList, styles } from "@/components/admin-read-list";
import {
  awardStaffBadge,
  getStaffBadges,
  getStaffPlayers,
  saveStaffBadge,
} from "@/lib/api";
import { colors } from "@/constants/theme";
import { StaffBadge, StaffPlayer } from "@/types";
const StyleSheet = { absoluteFillObject: NativeStyleSheet.absoluteFill };

export default function StaffBadgesScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<StaffBadge | null>(null);
  const [players, setPlayers] = useState<StaffPlayer[]>([]);
  useEffect(() => {
    void getStaffPlayers().then((result) => setPlayers(result.players));
  }, []);
  return (
    <>
      <AdminReadList<StaffBadge>
        headerAction={
          <Pressable onPress={() => router.push("/admin/badges/edit" as never)}>
            <Text style={styles.action}>New badge</Text>
          </Pressable>
        }
        description="Create, find, edit, and award prestige badges."
        empty="No badges matched your search."
        label="Badges"
        loadItems={async (query) => (await getStaffBadges(query)).badges}
        placeholder="Name, description, or achievement key"
        renderItem={(badge) => (
          <>
            <View style={styles.row}>
              <Text style={styles.state}>{badge.icon}</Text>
              <Text style={styles.name}>{badge.name}</Text>
            </View>
            <Text style={styles.meta}>
              {badge.description}
              {badge.hidden ? " · Hidden" : ""}
            </Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() =>
                  router.push(`/admin/badges/edit?id=${badge.id}` as never)
                }
              >
                <Text style={styles.action}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => setSelected(badge)}>
                <Text style={styles.action}>Award to player</Text>
              </Pressable>
            </View>
          </>
        )}
        title="Badges"
      />
      <Modal
        animationType="slide"
        transparent
        visible={Boolean(selected)}
        onRequestClose={() => setSelected(null)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable
            onPress={() => setSelected(null)}
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(0,0,0,0.58)",
            }}
          />
          <View
            style={{
              backgroundColor: colors.surfaceElevated,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: "75%",
              padding: 24,
            }}
          >
            <Text style={styles.title}>Award {selected?.name}</Text>
            <Text style={styles.subtitle}>
              Choose a player to award or remove this badge.
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {players.map((player) => (
                <Pressable
                  key={player.id}
                  onPress={() =>
                    void (async () => {
                      try {
                        const result = await awardStaffBadge(
                          selected!.id,
                          player.id,
                        );
                        setSelected(null);
                        Alert.alert(
                          result.awarded ? "Badge awarded" : "Badge removed",
                          player.username,
                        );
                      } catch (e) {
                        Alert.alert(
                          "Unable to update badge",
                          e instanceof Error ? e.message : "Please try again.",
                        );
                      }
                    })()
                  }
                  style={{
                    borderBottomColor: colors.borderSoft,
                    borderBottomWidth: 1,
                    paddingVertical: 14,
                  }}
                >
                  <Text style={styles.name}>
                    {player.first_name || player.username}
                  </Text>
                  <Text style={styles.meta}>@{player.username}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function BadgeEditor() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [badge, setBadge] = useState<StaffBadge>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🏆");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!id) return;
    void getStaffBadges().then(({ badges }) => {
      const found = badges.find((item) => item.id === Number(id));
      if (found) {
        setBadge(found);
        setName(found.name);
        setDescription(found.description);
        setIcon(found.icon);
      }
    });
  }, [id]);
  const save = async () => {
    setSaving(true);
    try {
      await saveStaffBadge(
        {
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description,
          icon,
          achievement_key: "",
          hidden: false,
          display_next_to_name: true,
          active: true,
          sort_order: 0,
        },
        badge?.id,
      );
      Alert.alert("Saved", "Badge saved.");
      router.back();
    } catch (e) {
      Alert.alert(
        "Unable to save badge",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <ScrollView
      contentContainerStyle={{
        backgroundColor: colors.background,
        flexGrow: 1,
        gap: 14,
        padding: 24,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{badge ? "Edit badge" : "New badge"}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name"
        placeholderTextColor={colors.textMuted}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 12,
          borderWidth: 1,
          color: colors.text,
          minHeight: 52,
          padding: 14,
        }}
      />
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Description"
        placeholderTextColor={colors.textMuted}
        multiline
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 12,
          borderWidth: 1,
          color: colors.text,
          minHeight: 96,
          padding: 14,
        }}
      />
      <TextInput
        value={icon}
        onChangeText={setIcon}
        placeholder="Icon"
        placeholderTextColor={colors.textMuted}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 12,
          borderWidth: 1,
          color: colors.text,
          minHeight: 52,
          padding: 14,
        }}
      />
      <Pressable disabled={saving || !name} onPress={() => void save()}>
        <Text style={styles.action}>{saving ? "Saving…" : "Save badge"}</Text>
      </Pressable>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.action}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}
