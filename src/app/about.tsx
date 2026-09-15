import Constants from 'expo-constants';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from '@/components/queueup-icon';
import { colors, Spacing } from '@/constants/theme';

const logo = require('../../assets/images/queueup-logo-transparent.png');

export default function AboutScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
    <View style={styles.header}><Pressable accessibilityLabel="Go back to settings" accessibilityRole="button" onPress={() => router.back()} style={styles.back}><ChevronLeft color={colors.brand} size={24} /><Text style={styles.backLabel}>Settings</Text></Pressable><Text style={styles.headerTitle}>About</Text><View style={styles.spacer} /></View>
    <View style={styles.content}><Image accessibilityLabel="QueueUp logo" contentFit="contain" source={logo} style={styles.logo} /><Text style={styles.title}>About this app</Text><Text style={styles.brand}>QueueUp</Text><Text style={styles.copyright}>Copyright QueueUp Music 2026</Text><Text style={styles.version}>Version {version}</Text></View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: 'center', borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: Spacing.lg },
  back: { alignItems: 'center', flexDirection: 'row', gap: Spacing.xs, minHeight: 44, minWidth: 84 },
  backLabel: { color: colors.brandLight, fontSize: 15, fontWeight: '700' },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  spacer: { minWidth: 84 },
  content: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xl },
  logo: { height: 96, marginTop: Spacing.xl, width: 96 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: Spacing.lg },
  brand: { color: colors.text, fontSize: 22, fontWeight: '600', marginTop: Spacing.lg },
  copyright: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  version: { color: colors.textMuted, fontSize: 14, marginTop: Spacing.xl },
});
