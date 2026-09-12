import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

/**
 * A neutral target for a bare native app activation while auth and any
 * notification response are being resolved. It intentionally renders no UI.
 */
export default function NativeEntry() {
  return <View style={styles.screen} />;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
