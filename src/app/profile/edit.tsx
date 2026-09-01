import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Action, ErrorMessage, Field } from '@/components/auth-ui';
import { PlayerAvatar } from '@/components/player-avatar';
import { ChevronLeft } from '@/components/queueup-icon';
import { colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { getProfile, removeProfilePicture, updateProfile, uploadProfilePicture } from '@/lib/api';
import { resolveServerUrl } from '@/config/server';
import { ApiError, ProfileResponse } from '@/types';

type PickedPhoto = { uri: string; name: string; type: string };

function photoName(uri: string, mimeType?: string | null, fileName?: string | null): string {
  if (fileName) return fileName;
  const extension = mimeType?.split('/')[1] || uri.split('.').pop() || 'jpg';
  return `profile-picture.${extension.toLowerCase()}`;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refresh: refreshSession } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getProfile(user.username);
      setProfile(result);
      setDisplayName(result.player.display_name);
      setEmail(user.email);
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Unable to load your profile.');
      if (apiError.statusCode === 401) await refreshSession();
      else setError(apiError);
    } finally {
      setLoading(false);
    }
  }, [refreshSession, user]);

  // Load the authoritative profile once when the edit screen opens.
  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const pickPhoto = async () => {
    let ImagePicker: typeof import('expo-image-picker');
    try {
      ImagePicker = await import('expo-image-picker');
    } catch {
      Alert.alert('Photo picker unavailable', 'Please use the signed Expo Go SDK 57 build or a development build rebuilt with the latest app dependencies.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow QueueUp to access your photos so you can choose a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setPhoto({ uri: asset.uri, name: photoName(asset.uri, asset.mimeType, asset.fileName), type: asset.mimeType ?? 'image/jpeg' });
    setPhotoRemoved(false);
    setError(null);
  };

  const confirmRemove = () => {
    const hasStoredPicture = Boolean(profile?.player.picture_url);
    Alert.alert(hasStoredPicture ? 'Remove profile picture?' : 'Discard selected photo?', hasStoredPicture ? 'Your initials will be shown instead.' : 'The selected photo will not be uploaded.', [
      { text: 'Cancel', style: 'cancel' },
      { text: hasStoredPicture ? 'Remove' : 'Discard', style: 'destructive', onPress: () => { setPhoto(null); setPhotoRemoved(hasStoredPicture); } },
    ]);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const currentDisplayName = profile?.player.display_name ?? user?.display_name ?? '';
      if (displayName.trim() !== currentDisplayName || email.trim() !== (user?.email ?? '')) {
        await updateProfile({ display_name: displayName.trim(), email: email.trim() });
      }
      if (photo) await uploadProfilePicture(photo);
      else if (photoRemoved) await removeProfilePicture();
      await refreshSession();
      router.back();
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : ApiError.networkError('Unable to save your profile.');
      if (apiError.statusCode === 401) await refreshSession();
      setError(apiError);
    } finally {
      setSaving(false);
    }
  };

  const currentPicture = photo?.uri ?? (photoRemoved ? null : resolveServerUrl(profile?.player.picture_url ?? null));
  if (loading && !profile) return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}><Header onBack={() => router.back()} /><View style={styles.center}><ActivityIndicator color={colors.brand} /></View></SafeAreaView>;

  return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
    <Header onBack={() => router.back()} />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Edit profile</Text>
        <Text style={styles.subtitle}>Update how you appear around QueueUp.</Text>
        {error ? <ErrorMessage message={error.message} fieldErrors={error.fieldErrors} /> : null}
        <View style={styles.photoSection}>
          {currentPicture ? <Image accessibilityLabel="Profile picture preview" source={{ uri: currentPicture }} style={styles.avatar} /> : <PlayerAvatar size={112} user={profile?.player ?? user!} />}
          <View style={styles.photoActions}><Action onPress={() => void pickPhoto()} secondary>{currentPicture ? 'Change photo' : 'Choose photo'}</Action>{(currentPicture || profile?.player.picture_url) && !photoRemoved ? <Pressable accessibilityRole="button" onPress={confirmRemove} style={({ pressed }) => [styles.remove, pressed && styles.pressed]}><Text style={styles.removeText}>Remove photo</Text></Pressable> : null}</View>
          <Text style={styles.photoHint}>JPG, PNG, GIF, WebP, or HEIC · maximum 5 MB</Text>
        </View>
        <Field autoCapitalize="words" autoCorrect={false} label="Display name" onChangeText={setDisplayName} returnKeyType="done" value={displayName} />
        <Text style={styles.readOnlyLabel}>Username</Text><Text style={styles.readOnlyValue}>@{user?.username}</Text>
        <Field autoCapitalize="none" autoCorrect={false} keyboardType="email-address" label="Email" onChangeText={setEmail} returnKeyType="done" textContentType="emailAddress" value={email} />
        <Action disabled={saving} onPress={() => void save()}>{saving ? 'Saving…' : 'Save changes'}</Action>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function Header({ onBack }: { onBack: () => void }) { return <View style={styles.header}><Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={8} onPress={onBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><ChevronLeft color={colors.brand} size={24} /><Text style={styles.backLabel}>Profile</Text></Pressable><Text style={styles.headerTitle}>Edit profile</Text><View style={styles.headerSpacer} /></View>; }

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 }, flex: { flex: 1 }, center: { flex: 1, justifyContent: 'center' },
  header: { alignItems: 'center', borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: Spacing.lg },
  back: { alignItems: 'center', flexDirection: 'row', gap: Spacing.xs, minHeight: 44, minWidth: 84 }, backLabel: { color: colors.brandLight, fontSize: 15, fontWeight: '700' }, headerTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, headerSpacer: { minWidth: 84 },
  content: { alignSelf: 'center', gap: Spacing.md, maxWidth: 560, padding: Spacing.xl, paddingBottom: Spacing.xxxl, width: '100%' }, title: { color: colors.text, fontSize: 34, fontWeight: '900', letterSpacing: -1 }, subtitle: { color: colors.textMuted, fontSize: 16, lineHeight: 23, marginBottom: Spacing.sm },
  photoSection: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md }, avatar: { backgroundColor: colors.surfaceHighest, borderRadius: 56, height: 112, width: 112 }, photoActions: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm }, remove: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm }, removeText: { color: colors.danger, fontSize: 14, fontWeight: '700' }, photoHint: { color: colors.textMuted, fontSize: 12, textAlign: 'center' }, readOnlyLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: Spacing.xs }, readOnlyValue: { color: colors.text, fontSize: 16, marginBottom: Spacing.xs }, pressed: { opacity: 0.76 },
});
