import { Text } from 'react-native';
import { AuthFrame, Brand, styles } from '@/components/auth-ui';

export default function ArchiveScreen() {
  return <AuthFrame><Brand /><Text style={styles.heading}>Archive</Text><Text style={styles.subheading}>Your past rounds will live here.</Text></AuthFrame>;
}
