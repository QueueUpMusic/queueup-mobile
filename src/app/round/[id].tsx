import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AuthFrame, Brand, styles } from '@/components/auth-ui';

export default function RoundPlaceholder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AuthFrame><Brand /><Text style={styles.heading}>Round {id}</Text><Text style={styles.subheading}>Round details are coming next. Submission and voting are not available yet.</Text></AuthFrame>;
}
