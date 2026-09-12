/**
 * Normalize native activation URLs before Expo Router turns them into routes.
 * The bare custom-scheme URL means "open QueueUp", not an app route.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string {
  if (path === 'queueupmobile:///' || path === 'queueupmobile://' || path === 'queueupmobile:') return '/native-entry';
  // Some iOS activation paths are normalized to `/` before this hook runs.
  // Only treat that exact initial path as a bare app launch; valid deep links
  // are returned unchanged.
  if (initial && path === '/') return '/native-entry';
  return path || (initial ? '/native-entry' : '/');
}
