import { Text } from 'react-native';
import { Action, AuthFrame, Brand, styles } from '@/components/auth-ui';
import { useAuth } from '@/context/auth';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  return <AuthFrame><Brand /><Text style={styles.heading}>{user?.display_name}</Text><Text style={styles.subheading}>@{user?.username}{'\n\n'}Profile coming next.</Text><Action secondary onPress={() => { void logout(); }}>Log out</Action></AuthFrame>;
}
