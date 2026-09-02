import { Tabs } from 'expo-router';
import { QueueUpIcon } from '@/components/queueup-icon';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth';

export default function PlayerTabsLayout() {
  const { user } = useAuth();
  const isStaff = Boolean(user?.is_staff || user?.is_superuser);
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.brand, tabBarInactiveTintColor: colors.textMuted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border }, tabBarItemStyle: { paddingTop: 5 }, tabBarLabelStyle: { fontWeight: '700', marginTop: 2 } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <QueueUpIcon color={color} name="home" /> }} />
    <Tabs.Screen name="archive" options={{ title: 'Archive', tabBarIcon: ({ color }) => <QueueUpIcon color={color} name="archive" /> }} />
    <Tabs.Screen name="rankings" options={{ title: 'Ranks', tabBarIcon: ({ color }) => <QueueUpIcon color={color} name="rankings" /> }} />
    <Tabs.Screen name="admin" options={{ href: isStaff ? undefined : null, title: 'Admin', tabBarIcon: ({ color }) => <QueueUpIcon color={color} name="admin" /> }} />
  </Tabs>;
}
