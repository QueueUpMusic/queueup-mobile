import { Tabs } from 'expo-router';
import { QueueUpIcon } from '@/components/queueup-icon';
import { colors } from '@/constants/theme';

export default function PlayerTabsLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.brand, tabBarInactiveTintColor: colors.textMuted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border }, tabBarLabelStyle: { fontWeight: '700' } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <QueueUpIcon color={color} name="home" /> }} />
    <Tabs.Screen name="archive" options={{ title: 'Archive', tabBarIcon: ({ color }) => <QueueUpIcon color={color} name="archive" /> }} />
    <Tabs.Screen name="rankings" options={{ title: 'Ranks', tabBarIcon: ({ color }) => <QueueUpIcon color={color} name="rankings" /> }} />
  </Tabs>;
}
