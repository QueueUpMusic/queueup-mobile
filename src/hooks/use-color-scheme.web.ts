import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * React Native's useColorScheme handles SSR appropriately for React 19+.
 */
export function useColorScheme() {
  return useRNColorScheme();
}
