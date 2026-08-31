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

export function ChevronDown({ color, size = 20 }: { color: ColorValue; size?: number }) {
  return <Svg accessibilityLabel="Expand" fill="none" height={size} viewBox="0 0 24 24" width={size}>
    <Path d="m6 9 6 6 6-6" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} />
  </Svg>;
}

export function ArrowRight({ color, size = 19 }: { color: ColorValue; size?: number }) {
  return <Svg accessibilityLabel="Continue" fill="none" height={size} viewBox="0 0 24 24" width={size}>
    <Path d="M5 12h13m-6-6 6 6-6 6" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.1} />
  </Svg>;
}

export function ChevronLeft({ color, size = 24 }: { color: ColorValue; size?: number }) {
  return <Svg accessibilityLabel="Go back" fill="none" height={size} viewBox="0 0 24 24" width={size}>
    <Path d="m15 5-7 7 7 7" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.1} />
  </Svg>;
}

export function Checkmark({ color, size = 18 }: { color: ColorValue; size?: number }) {
  return <Svg accessibilityLabel="Selected" fill="none" height={size} viewBox="0 0 24 24" width={size}>
    <Path d="m5 12 4 4L19 6" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} />
  </Svg>;
}
