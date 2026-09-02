import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/constants/theme';

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

export function ShareIcon({ color, size = 20 }: { color: ColorValue; size?: number }) {
  return <Svg accessibilityLabel="Share" fill="none" height={size} viewBox="0 0 24 24" width={size}><Path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M5 12v7h14v-7" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} /></Svg>;
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

export function CheckboxIcon({ color, checked, size = 24 }: { color: ColorValue; checked?: boolean; size?: number }) {
  return <Svg accessibilityLabel={checked ? 'Checked' : 'Unchecked'} fill="none" height={size} viewBox="0 0 24 24" width={size}>
    <Path d="M5 3.75h14A1.25 1.25 0 0 1 20.25 5v14A1.25 1.25 0 0 1 19 20.25H5A1.25 1.25 0 0 1 3.75 19V5A1.25 1.25 0 0 1 5 3.75Z" fill={checked ? color : 'none'} stroke={color} strokeWidth={1.8} />
    {checked ? <Path d="m7.5 12 3 3 6-6" stroke={colors.background} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /> : null}
  </Svg>;
}

export function SearchIcon({ color, size = 21 }: { color: ColorValue; size?: number }) {
  return <Svg accessibilityLabel="Search" fill="none" height={size} viewBox="0 0 24 24" width={size}>
    <Path d="m20 20-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" stroke={color} strokeLinecap="round" strokeWidth={2} />
  </Svg>;
}

export function PlayIcon({ color, size = 18 }: { color: ColorValue; size?: number }) {
  return <Svg accessibilityLabel="Play preview" fill={color} height={size} viewBox="0 0 24 24" width={size}><Path d="m8 5 11 7-11 7V5Z" /></Svg>;
}

export function PauseIcon({ color, size = 18 }: { color: ColorValue; size?: number }) {
  return <Svg accessibilityLabel="Pause preview" fill={color} height={size} viewBox="0 0 24 24" width={size}><Path d="M7 5h3v14H7zM14 5h3v14h-3z" /></Svg>;
}

export function StarIcon({ color, filled = false, size = 30 }: { color: ColorValue; filled?: boolean; size?: number }) {
  return <Svg accessibilityLabel={filled ? 'Rated star' : 'Unrated star'} fill={filled ? color : 'none'} height={size} viewBox="0 0 24 24" width={size}>
    <Path d="m12 3 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.92 1.06-6.2L3 9.53l6.22-.9L12 3Z" stroke={color} strokeLinejoin="round" strokeWidth={1.7} />
  </Svg>;
}

export function SparkleIcon({ color, size = 25 }: { color: ColorValue; size?: number }) {
  return <Svg accessibilityLabel="Season recap" fill={color} height={size} viewBox="0 0 24 24" width={size}><Path d="M12 2.2c.45 5.45 4.35 9.35 9.8 9.8-5.45.45-9.35 4.35-9.8 9.8-.45-5.45-4.35-9.35-9.8-9.8 5.45-.45 9.35-4.35 9.8-9.8Z" /></Svg>;
}

export function SettingsIcon({ color, size = 22 }: { color: ColorValue; size?: number }) {
  return <Svg accessibilityLabel="Settings" fill="none" height={size} viewBox="0 0 24 24" width={size}>
    <Path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" stroke={color} strokeWidth={1.8} />
    <Path d="m19.1 13.4 1.3 1-.1.3-1.4 2.4-.3-.1-1.6-.5a7.7 7.7 0 0 1-1.5.9l-.3 1.7h-2.8l-.3-1.7a7.7 7.7 0 0 1-1.5-.9l-1.6.5-.3.1-1.4-2.4-.1-.3 1.3-1a7.8 7.8 0 0 1 0-1.8l-1.3-1 .1-.3 1.4-2.4.3.1 1.6.5a7.7 7.7 0 0 1 1.5-.9l.3-1.7h2.8l.3 1.7a7.7 7.7 0 0 1 1.5.9l1.6-.5.3.1 1.4 2.4.1.3-1.3 1a7.8 7.8 0 0 1 0 1.8Z" stroke={color} strokeLinejoin="round" strokeWidth={1.5} />
  </Svg>;
}

export function LogOutIcon({ color, size = 22 }: { color: ColorValue; size?: number }) {
  return <Svg accessibilityLabel="Log out" fill="none" height={size} viewBox="0 0 24 24" width={size}>
    <Path d="M10 17l5-5-5-5M15 12H3M14 3h7v18h-7" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
  </Svg>;
}
