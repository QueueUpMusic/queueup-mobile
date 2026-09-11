import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

export function ProfileLink({
  username,
  displayName,
  style,
}: {
  username: string;
  displayName: string;
  style?: object;
}) {
  const router = useRouter();
  return <Pressable
    accessibilityLabel={`Open ${displayName}'s profile`}
    accessibilityRole="button"
    hitSlop={6}
    onPress={() => router.push(`/profile/${encodeURIComponent(username)}` as never)}
    style={({ pressed }) => [styles.touchTarget, pressed && styles.pressed]}
  >
    <Text numberOfLines={1} style={[styles.name, style]}>{displayName}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  touchTarget: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 36 },
  name: { color: colors.text },
  pressed: { opacity: 0.68 },
});
