import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ArrowRight, SparkleIcon } from '@/components/queueup-icon';
import { Radii, Spacing } from '@/constants/theme';
import { SeasonSummary } from '@/types';

type RecapBannerProps = {
  season: SeasonSummary;
  onPress: () => void;
};

export function RecapBanner({ season, onPress }: RecapBannerProps) {
  return <Pressable accessibilityLabel={`Open your ${season.name} recap`} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.banner, pressed && styles.pressed]}>
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none"><Defs><LinearGradient id="recapBannerGradient" x1="0" x2="1" y1="0" y2="0"><Stop offset="0" stopColor="#ffdc62" /><Stop offset="0.43" stopColor="#ff9273" /><Stop offset="0.72" stopColor="#d582c5" /><Stop offset="1" stopColor="#a783ff" /></LinearGradient></Defs><Rect fill="url(#recapBannerGradient)" height="100" rx="8" width="100" /></Svg>
    <SparkleIcon color="#17142c" size={25} />
    <View style={styles.copy}><Text numberOfLines={2} style={styles.title}>Your {season.name} recap is ready</Text><Text style={styles.subtitle}>A colorful look back at your season</Text></View>
    <View style={styles.action}><Text style={styles.actionText}>View recap</Text><ArrowRight color="#17142c" size={17} /></View>
  </Pressable>;
}

const styles = StyleSheet.create({
  banner: { alignItems: 'center', borderRadius: Radii.medium, flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg, overflow: 'hidden', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  copy: { flex: 1, gap: 3, minWidth: 0 },
  title: { color: '#17142c', fontSize: 16, fontWeight: '900', lineHeight: 21 },
  subtitle: { color: '#342044', fontSize: 13, lineHeight: 18 },
  action: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  actionText: { color: '#17142c', fontSize: 13, fontWeight: '900' },
  pressed: { opacity: 0.76 },
});
