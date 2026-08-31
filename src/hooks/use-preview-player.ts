import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef } from 'react';

export function usePreviewPlayer({ trackId, previewUrl, onStop, onError }: { trackId: string | number | null; previewUrl: string | null; onStop: () => void; onError?: (message: string) => void }) {
  const player = useAudioPlayer(previewUrl || null);
  const status = useAudioPlayerStatus(player);
  const callbacks = useRef({ onStop, onError });
  useEffect(() => { callbacks.current = { onStop, onError }; }, [onError, onStop]);

  useEffect(() => {
    if (previewUrl) void player.play();
    return () => { player.pause(); };
  }, [player, previewUrl, trackId]);

  useEffect(() => {
    if (status.error) {
      callbacks.current.onError?.('Preview could not be played.');
      callbacks.current.onStop();
    } else if (trackId && !status.playing && status.currentTime > 0 && status.currentTime >= status.duration) {
      callbacks.current.onStop();
    }
  }, [status.currentTime, status.duration, status.error, status.playing, trackId]);

  return { isBuffering: Boolean(previewUrl && status.isBuffering) };
}
