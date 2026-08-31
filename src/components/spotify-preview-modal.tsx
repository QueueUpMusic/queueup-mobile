import { useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Action } from '@/components/auth-ui';
import { colors, Radii, Spacing } from '@/constants/theme';

export function SpotifyEmbed({ trackId }: { trackId: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>Spotify preview is unavailable right now.</Text> : <View style={{ borderRadius: Radii.medium, height: 152, overflow: 'hidden', width: '100%' }}><WebView allowsInlineMediaPlayback javaScriptEnabled mediaPlaybackRequiresUserAction={false} onError={() => setFailed(true)} source={{ uri: `https://open.spotify.com/embed/track/${encodeURIComponent(trackId)}?theme=0` }} style={{ flex: 1, width: '100%' }} /></View>;
}

export function SpotifyPreviewModal({ trackId, onClose }: { trackId: string; onClose: () => void }) {
  return <Modal animationType="fade" onRequestClose={onClose} transparent visible><View style={{ alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.72)', flex: 1, justifyContent: 'center', padding: Spacing.xl }}><View style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.brand, borderRadius: Radii.large, borderWidth: 1, gap: Spacing.md, maxWidth: 460, padding: Spacing.lg, width: '100%' }}><SpotifyEmbed trackId={trackId} /><Action secondary onPress={onClose}>Close preview</Action></View></View></Modal>;
}
