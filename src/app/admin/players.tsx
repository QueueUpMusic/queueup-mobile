import { Alert, Pressable, View, Text } from 'react-native';
import { useState } from 'react';
import { AdminReadList, styles } from '@/components/admin-read-list';
import { PlayerAvatar } from '@/components/player-avatar';
import { ProfileLink } from '@/components/profile-link';
import { getProfile, getStaffPlayers, staffPlayerAction } from '@/lib/api';
import { StaffPlayer } from '@/types';

async function loadPlayers(query: string): Promise<StaffPlayer[]> {
  const players = (await getStaffPlayers(query)).players;
  return Promise.all(players.map(async (player) => {
    try { return { ...player, picture_url: (await getProfile(player.username)).player.picture_url }; } catch { return player; }
  }));
}

export default function StaffPlayersScreen() {
  const [reload, setReload] = useState(0); const [busy, setBusy] = useState<number | null>(null);
  const action = (player: StaffPlayer, name: string, label: string) => Alert.alert(label, `Are you sure you want to ${label.toLowerCase()} ${player.username}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: label, style: name === 'toggle_active' ? 'destructive' : 'default', onPress: () => void (async () => {
      setBusy(player.id); try { await staffPlayerAction(player.id, name); setReload((value) => value + 1); } catch (e) { Alert.alert('Unable to update player', e instanceof Error ? e.message : 'Please try again.'); } finally { setBusy(null); }
    })() },
  ]);
  return <AdminReadList<StaffPlayer> key={reload} description="Approve accounts and manage player access." empty="No players matched your search." label="Players" loadItems={loadPlayers} placeholder="Name, username, or email" renderItem={(player) => <>
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 14 }}>
      <PlayerAvatar size={48} pictureUrl={player.picture_url} user={{ display_name: player.first_name || player.username, picture_url: player.picture_url }} />
      <View style={{ flex: 1, gap: 2 }}><ProfileLink displayName={player.first_name || player.username} style={styles.name} username={player.username} /><Text style={styles.meta}>@{player.username} · {player.play_count} rounds{player.is_staff ? ' · Staff' : ''}{!player.approved ? ' · Waiting for approval' : ''}{!player.is_active ? ' · Inactive' : ''}</Text></View>
    </View>
    <View style={styles.actions}>{!player.approved ? <Pressable disabled={busy === player.id} onPress={() => action(player, 'approve', 'Approve')}><Text style={styles.action}>Approve</Text></Pressable> : null}<Pressable disabled={busy === player.id} onPress={() => action(player, 'toggle_active', player.is_active ? 'Deactivate' : 'Reactivate')}><Text style={styles.action}>{player.is_active ? 'Deactivate' : 'Reactivate'}</Text></Pressable><Pressable disabled={busy === player.id} onPress={() => action(player, 'toggle_staff', player.is_staff ? 'Remove staff' : 'Make staff')}><Text style={styles.action}>{player.is_staff ? 'Remove staff' : 'Make staff'}</Text></Pressable></View>
  </>} title="Players" />;
}
