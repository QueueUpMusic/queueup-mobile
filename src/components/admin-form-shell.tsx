import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from '@/components/queueup-icon';
import { colors, Spacing } from '@/constants/theme';
export function AdminFormShell({ title, children }: PropsWithChildren<{ title: string }>) { const router = useRouter(); const insets = useSafeAreaInsets(); return <View style={styles.screen}><View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}><Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.back}><ChevronLeft color={colors.text} /></Pressable><Text style={styles.headerTitle}>{title}</Text><View style={styles.spacer} /></View>{children}</View>; }
const styles = StyleSheet.create({ screen: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'center', borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', paddingBottom: Spacing.md, paddingHorizontal: Spacing.xl }, back: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 }, headerTitle: { color: colors.text, flex: 1, fontSize: 17, fontWeight: '800', textAlign: 'center' }, spacer: { width: 44 } });
