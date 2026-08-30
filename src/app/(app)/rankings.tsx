import { Text } from 'react-native';
import { AuthFrame, Brand, styles } from '@/components/auth-ui';

export default function RankingsScreen() {
  return <AuthFrame><Brand /><Text style={styles.heading}>Ranks</Text><Text style={styles.subheading}>Season rankings are coming next.</Text></AuthFrame>;
}
