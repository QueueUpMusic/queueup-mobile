/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';
import '@/global.css';

export const Colors = {
  background: '#07100c',
  backgroundSecondary: '#0a1510',
  surface: '#111a16',
  surfaceElevated: '#17211c',
  surfaceHighest: '#1d2922',
  border: '#28372f',
  borderSoft: 'rgba(255, 255, 255, 0.07)',
  text: '#f6faf7',
  textMuted: '#9eaaa3',
  brand: '#20df72',
  brandLight: '#8bf2b2',
  danger: '#ff6b7d',
  warning: '#f5c45c',
} as const;

// Kept for the starter themed components while the app uses one dark brand system.
export const Theme = { light: Colors, dark: Colors } as const;
export const colors = Colors;

export type ThemeColor = keyof typeof Colors;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 44,
} as const;

export const Radii = { small: 12, medium: 18, large: 28 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
