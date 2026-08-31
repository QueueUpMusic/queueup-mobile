import { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand } from '@/components/auth-ui';
import { PlayerAvatar } from '@/components/player-avatar';
import { colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';

type PlayerHeaderProps = PropsWithChildren<{ leftAction?: ReactNode; rightAction?: ReactNode; showAvatar?: boolean }>;

/** The authenticated header owns the top inset and leaves an action slot for the future avatar. */
export function PlayerHeader({ leftAction, rightAction, showAvatar = true }: PlayerHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  return <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
    {leftAction ? <View style={styles.slot}>{leftAction}</View> : null}
    <Brand compact />
    {rightAction ?? (showAvatar && user ? <Pressable accessibilityHint="Opens your profile" accessibilityLabel="Open profile" accessibilityRole="button" hitSlop={8} onPress={() => router.push('/profile')} style={({ pressed }) => [styles.action, pressed && styles.pressed]}><PlayerAvatar size={40} user={user} /></Pressable> : leftAction ? <View style={styles.slot} /> : null)}
  </View>;
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', backgroundColor: colors.background, borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: Spacing.md, paddingHorizontal: Spacing.xl },
  action: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 },
  slot: { minHeight: 44, minWidth: 44 },
  pressed: { opacity: 0.76 },
});
