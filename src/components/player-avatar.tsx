import { StyleSheet, Text, View } from 'react-native';
import { CachedImage } from '@/components/cached-image';
import { resolveServerUrl } from '@/config/server';
import { colors } from '@/constants/theme';
import { SessionUser, UserSummary } from '@/types';

type AvatarUser = Pick<UserSummary, 'display_name' | 'picture_url'> | Pick<SessionUser, 'display_name'>;

export function PlayerAvatar({ user, size = 42, pictureUrl: pictureUrlOverride }: { user: AvatarUser; size?: number; pictureUrl?: string | null }) {
  const pictureUrl = resolveServerUrl(pictureUrlOverride !== undefined ? pictureUrlOverride : ('picture_url' in user ? user.picture_url : null));
  const initial = user.display_name.trim().charAt(0).toUpperCase() || '?';
  const radius = size / 2;

  return <View style={[styles.avatar, { borderRadius: radius, height: size, width: size }]}>
    {pictureUrl ? <CachedImage accessibilityLabel={`${user.display_name} profile picture`} source={{ uri: pictureUrl }} style={styles.image} /> : <Text style={[styles.initial, { fontSize: Math.max(14, size * 0.4) }]}>{initial}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', backgroundColor: colors.surfaceHighest, borderColor: colors.border, borderWidth: 1, justifyContent: 'center', overflow: 'hidden' },
  image: { height: '100%', width: '100%' },
  initial: { color: colors.brandLight, fontWeight: '900' },
});
