import { Image, ImageProps } from "expo-image";

/** QueueUp's remote artwork/avatar images use Expo's memory+disk cache. */
export function CachedImage(props: ImageProps) {
  return <Image cachePolicy="memory-disk" transition={120} {...props} />;
}
