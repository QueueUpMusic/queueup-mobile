import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type QueueUpIconName = 'home' | 'archive' | 'rankings' | 'profile';
const symbols = {
  home: { ios: 'house', android: 'home', web: 'home' },
  archive: { ios: 'archivebox', android: 'archive', web: 'archive' },
  rankings: { ios: 'trophy', android: 'emoji_events', web: 'emoji_events' },
  profile: { ios: 'person', android: 'person', web: 'person' },
} as const;

export function QueueUpIcon({ name, color, size = 22 }: { name: QueueUpIconName; color: ColorValue; size?: number }) {
  if (name === 'archive') {
    return <Svg accessibilityLabel="archive tab" fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M4 7h16v14H4zM3 3h18v4H3z" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} />
      <Path d="M9 11h6" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} />
    </Svg>;
  }
  return <SymbolView accessibilityLabel={`${name} tab`} name={symbols[name]} size={size} tintColor={color} weight="semibold" />;
}
