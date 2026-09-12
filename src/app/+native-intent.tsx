/**
 * Normalize native activation URLs before Expo Router turns them into routes.
 * The bare custom-scheme URL means "open QueueUp", not an app route.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  if (path === 'queueupmobile:///' || path === 'queueupmobile://' || path === 'queueupmobile:') return '/';
  return path || '/';
}
