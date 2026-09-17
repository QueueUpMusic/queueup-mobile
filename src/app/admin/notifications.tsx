import { useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { AdminReadList, styles } from "@/components/admin-read-list";
import { AdminDateField } from "@/components/admin-date-field";
import { Action, ErrorMessage } from "@/components/auth-ui";
import { colors, Spacing } from "@/constants/theme";
import { createStaffNotification, getStaffNotifications } from "@/lib/api";
import { ApiError, StaffNotification } from "@/types";
export default function StaffNotificationsScreen() {
  const router = useRouter();
  return (
    <AdminReadList<StaffNotification>
      headerAction={
        <Pressable
          onPress={() => router.push("/admin/notifications/new" as never)}
        >
          <Text style={styles.action}>New notification</Text>
        </Pressable>
      }
      description="Send now or schedule server-side notifications."
      empty="No notifications yet."
      label="Notifications"
      loadItems={async () => (await getStaffNotifications()).notifications}
      placeholder="Search unavailable"
      renderItem={(item) => (
        <>
          <Text style={styles.name}>{item.title}</Text>
          <Text style={styles.meta}>
            {item.status} · {item.delivery_count} web delivered · {item.native_delivery_count ?? 0} mobile delivered
            {item.scheduled_for
              ? ` · scheduled ${new Date(item.scheduled_for).toLocaleString()}`
              : ""}
          </Text>
          <Text style={styles.meta}>Route: {item.destination} · Audience: {item.audience}</Text>
          <Text style={styles.meta}>{item.body}</Text>
        </>
      )}
      title="Notifications"
    />
  );
}
export function NotificationEditor() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [destination, setDestination] = useState("/home/");
  const [scheduledFor, setScheduledFor] = useState("");
  const [mode, setMode] = useState<"now" | "scheduled">("now");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const send = async (action: string) => {
    if (action === "schedule" && !scheduledFor) {
      setError(ApiError.fromHttpStatus(400, "Choose a date and time to schedule this notification."));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createStaffNotification({
        title,
        body,
        destination: destination.trim() || "/home/",
        audience: "approved",
        ...(action === "schedule" ? { scheduled_for: scheduledFor } : {}),
        ...(action === "send_now" ? { action } : {}),
      });
      Alert.alert(
        action === "send_now" ? "Sent" : "Scheduled",
        "Notification saved.",
      );
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.networkError("Unable to save this notification."));
    } finally {
      setSaving(false);
    }
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ gap: 14, padding: Spacing.xl, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>New notification</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor="#9aa7a1"
        style={[styles.search, { color: "#fff" }]}
      />
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Message"
        placeholderTextColor="#9aa7a1"
        multiline
        style={[styles.search, { color: "#fff", minHeight: 110 }]}
      />
      <Text style={editorStyles.fieldLabel}>Mobile destination route</Text>
      <TextInput value={destination} onChangeText={setDestination} autoCapitalize="none" autoCorrect={false} placeholder="/round/123" placeholderTextColor="#9aa7a1" style={[styles.search, { color: "#fff" }]} />
      <Text style={editorStyles.helper}>Use a QueueUp route such as /, /round/123, /round/123/vote, /profile, or /season/4/recap.</Text>
      <View style={editorStyles.modeRow}>
        <Pressable accessibilityRole="radio" accessibilityState={{ selected: mode === "now" }} onPress={() => setMode("now")} style={[editorStyles.modeButton, mode === "now" && editorStyles.modeButtonSelected]}><Text style={editorStyles.modeText}>Send now</Text></Pressable>
        <Pressable accessibilityRole="radio" accessibilityState={{ selected: mode === "scheduled" }} onPress={() => setMode("scheduled")} style={[editorStyles.modeButton, mode === "scheduled" && editorStyles.modeButtonSelected]}><Text style={editorStyles.modeText}>Schedule</Text></Pressable>
      </View>
      {mode === "scheduled" ? <AdminDateField label="Send at" onChangeText={setScheduledFor} onOpen={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80)} value={scheduledFor} /> : null}
      {error ? <ErrorMessage fieldErrors={error.fieldErrors} message={error.message} /> : null}
      <Action disabled={saving || !title.trim() || !body.trim() || (mode === "scheduled" && !scheduledFor)} onPress={() => {
        if (mode === "now") Alert.alert("Send now?", "This will notify approved players.", [{ text: "Cancel" }, { text: "Send now", onPress: () => void send("send_now") }]);
        else void send("schedule");
      }}>{saving ? "Saving…" : mode === "now" ? "Send now" : "Schedule notification"}</Action>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const editorStyles = {
  fieldLabel: { color: colors.text, fontSize: 14, fontWeight: "700" as const, marginTop: Spacing.sm },
  helper: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  modeRow: { flexDirection: "row" as const, gap: Spacing.sm, marginTop: Spacing.sm },
  modeButton: { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: 10, borderWidth: 1, flex: 1, minHeight: 48, justifyContent: "center" as const, paddingHorizontal: Spacing.md },
  modeButtonSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  modeText: { color: colors.text, fontSize: 15, fontWeight: "800" as const, textAlign: "center" as const },
};
