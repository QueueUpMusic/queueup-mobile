import { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand } from '@/components/auth-ui';
import { colors, Spacing } from '@/constants/theme';

type PlayerHeaderProps = PropsWithChildren<{ rightAction?: ReactNode }>;

/** The authenticated header owns the top inset and leaves an action slot for the future avatar. */
export function PlayerHeader({ rightAction }: PlayerHeaderProps) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
    <Brand compact />
    {rightAction ? <View style={styles.action}>{rightAction}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', backgroundColor: colors.background, borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: Spacing.md, paddingHorizontal: Spacing.xl },
  action: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 },
});
