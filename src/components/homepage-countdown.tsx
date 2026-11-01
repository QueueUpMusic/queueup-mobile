import { StyleSheet, Text, View } from 'react-native';
import { colors, Radii, Spacing } from '@/constants/theme';
import { HomepageCountdown } from '@/types';

function formatRemaining(targetAt: string, now: number) {
  const totalSeconds = Math.max(0, Math.ceil((new Date(targetAt).getTime() - now) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  if (hours > 0) return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

function formatTarget(targetAt: string) {
  const target = new Date(targetAt);
  return `until ${target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${target.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function CountdownCard({ countdown, now }: { countdown: HomepageCountdown; now: number }) {
  const expired = countdown.state === 'expired' || new Date(countdown.target_at).getTime() <= now;
  const value = expired ? "It's time!" : formatRemaining(countdown.target_at, now);
  return <View accessibilityLabel={`${countdown.title}, ${expired ? "it's time" : `${value} remaining`}`} style={styles.card}>
    <Text numberOfLines={2} style={styles.title}>{countdown.title}</Text>
    <Text style={[styles.value, expired && styles.expired]}>{value}</Text>
    {!expired ? <Text style={styles.target}>{formatTarget(countdown.target_at)}</Text> : null}
  </View>;
}

export function HomepageCountdowns({ countdowns, now }: { countdowns: HomepageCountdown[]; now: number }) {
  if (!countdowns.length) return null;
  return <View style={styles.stack}>{countdowns.map((countdown) => <CountdownCard key={countdown.id} countdown={countdown} now={now} />)}</View>;
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.sm },
  card: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: 'rgba(32, 223, 114, 0.3)', borderRadius: Radii.medium, borderWidth: 1, gap: Spacing.sm, overflow: 'hidden', padding: Spacing.lg },
  title: { color: colors.text, fontSize: 21, fontWeight: '900', lineHeight: 26, maxWidth: '100%', textAlign: 'center' },
  value: { color: colors.text, fontSize: 32, fontVariant: ['tabular-nums'], fontWeight: '900', letterSpacing: -0.7, textAlign: 'center' },
  expired: { color: colors.brandLight },
  target: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
