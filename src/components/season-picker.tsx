import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Checkmark, ChevronDown } from '@/components/queueup-icon';
import { colors, Radii, Spacing } from '@/constants/theme';
import { SeasonSummary } from '@/types';

export function defaultSeasonId(seasons: SeasonSummary[]): number | null {
  return seasons.find((season) => season.active)?.id ?? seasons[0]?.id ?? null;
}

export function SeasonPicker({
  seasons,
  selectedId,
  onSelect,
}: {
  seasons: SeasonSummary[];
  selectedId: number;
  onSelect: (seasonId: number) => void;
}) {
  const [visible, setVisible] = useState(false);
  const selected = seasons.find((season) => season.id === selectedId);

  return <>
    <Pressable accessibilityHint="Opens the season list" accessibilityLabel="Choose season" accessibilityRole="button" onPress={() => setVisible(true)} style={({ pressed }) => [styles.selector, pressed && styles.pressed]}>
      <View>
        <Text style={styles.selectorLabel}>Season</Text>
        <Text numberOfLines={1} style={styles.selectorValue}>{selected?.name ?? 'Choose a season'}</Text>
      </View>
      <ChevronDown color={colors.brand} size={21} />
    </Pressable>
    <Modal animationType="slide" onRequestClose={() => setVisible(false)} presentationStyle="overFullScreen" transparent visible={visible}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityLabel="Close season selector" onPress={() => setVisible(false)} style={styles.modalBackdrop} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Choose a season</Text>
            <Pressable accessibilityLabel="Close season selector" accessibilityRole="button" onPress={() => setVisible(false)} style={styles.sheetClose}>
              <Text style={styles.sheetCloseText}>×</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetList}>
            {seasons.map((season) => <Pressable accessibilityRole="button" key={season.id} onPress={() => { setVisible(false); onSelect(season.id); }} style={({ pressed }) => [styles.seasonOption, season.id === selectedId && styles.selectedSeasonOption, pressed && styles.pressed]}>
              <View style={styles.seasonOptionCopy}>
                <Text style={styles.seasonOptionName}>{season.name}</Text>
                {season.active ? <Text style={styles.activeLabel}>Active</Text> : null}
              </View>
              {season.id === selectedId ? <Checkmark color={colors.brand} size={22} /> : null}
            </Pressable>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  selector: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: Radii.medium, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 72, paddingHorizontal: Spacing.lg },
  selectorLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase' },
  selectorValue: { color: colors.text, fontSize: 17, fontWeight: '800', maxWidth: 280 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { backgroundColor: 'rgba(0, 0, 0, 0.58)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  sheet: { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderTopLeftRadius: Radii.large, borderTopRightRadius: Radii.large, borderWidth: 1, maxHeight: '70%', paddingBottom: Spacing.xl },
  sheetHeader: { alignItems: 'center', borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  sheetTitle: { color: colors.text, fontSize: 19, fontWeight: '800' },
  sheetClose: { alignItems: 'center', backgroundColor: colors.surfaceHighest, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  sheetCloseText: { color: colors.text, fontSize: 26, lineHeight: 30 },
  sheetList: { gap: Spacing.xs, padding: Spacing.md },
  seasonOption: { alignItems: 'center', borderRadius: Radii.small, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: Spacing.md },
  selectedSeasonOption: { backgroundColor: 'rgba(32, 223, 114, 0.1)' },
  seasonOptionCopy: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: Spacing.sm },
  seasonOptionName: { color: colors.text, flexShrink: 1, fontSize: 16, fontWeight: '700' },
  activeLabel: { color: colors.brandLight, fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.76 },
});
