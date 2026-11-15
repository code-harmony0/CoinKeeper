import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useKazaTheme } from '../../theme/kazaTheme';
import { PressableScale } from '../anim';
import { KazaSheet } from './KazaSheet';
import type { KazaPrayer, MakeUpEntry } from '../../store/kazaStore';

interface Props {
  visible: boolean;
  prayers: KazaPrayer[];
  /** Prayer to highlight as "next" in daily order. */
  suggested: string | null;
  onClose: () => void;
  onConfirm: (entries: MakeUpEntry[], daysAgo: number) => void;
}

/**
 * Log several prayers in one go — "2 Fajr, 1 Dhuhr" — for today or, when the
 * person forgot to log, yesterday.
 */
export const KazaLogSheet: React.FC<Props> = ({ visible, prayers, suggested, onClose, onConfirm }) => {
  const { colors } = useKazaTheme();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [daysAgo, setDaysAgo] = useState(0);

  useEffect(() => {
    if (visible) {
      setCounts({});
      setDaysAgo(0);
    }
  }, [visible]);

  const owed = useMemo(() => prayers.filter(p => p.pending > 0), [prayers]);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  const setCount = (prayer: KazaPrayer, next: number) =>
    setCounts(prev => ({ ...prev, [prayer.name]: Math.max(0, Math.min(prayer.pending, next)) }));

  const fillFullDay = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setCounts(Object.fromEntries(owed.map(p => [p.name, 1])));
  };

  const confirm = () => {
    const entries = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => ({ name, count }));
    if (entries.length === 0) return;
    onConfirm(entries, daysAgo);
  };

  return (
    <KazaSheet visible={visible} title="Log made-up prayers" onClose={onClose}>
      <View style={styles.dayRow}>
        {['Today', 'Yesterday'].map((label, i) => (
          <PressableScale
            key={label}
            onPress={() => setDaysAgo(i)}
            accessibilityRole="button"
            accessibilityState={{ selected: daysAgo === i }}
            style={[styles.dayChip, { backgroundColor: daysAgo === i ? colors.primaryAccent : colors.card }]}
          >
            <Text style={[styles.dayChipText, { color: daysAgo === i ? colors.onAccent : colors.textPrimary }]}>{label}</Text>
          </PressableScale>
        ))}
        <PressableScale onPress={fillFullDay} style={[styles.dayChip, { backgroundColor: colors.card }]}>
          <Text style={[styles.dayChipText, { color: colors.textPrimary }]}>A full day</Text>
        </PressableScale>
      </View>

      {owed.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>Nothing left to make up. Alhamdulillah.</Text>
      ) : (
        owed.map(prayer => {
          const count = counts[prayer.name] ?? 0;
          return (
            <View key={prayer.name} style={[styles.row, { backgroundColor: colors.card }]}>
              <View style={styles.rowInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: colors.textPrimary }]}>{prayer.name}</Text>
                  {suggested === prayer.name && (
                    <View style={[styles.nextTag, { backgroundColor: colors.chipBg }]}>
                      <Text style={[styles.nextText, { color: colors.textSecondary }]}>Next in order</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.pending, { color: colors.textSecondary }]}>{prayer.pending} left</Text>
              </View>
              <View style={styles.stepper}>
                <PressableScale
                  onPress={() => setCount(prayer, count - 1)}
                  disabled={count === 0}
                  accessibilityLabel={`One less ${prayer.name}`}
                  style={[styles.stepButton, { backgroundColor: colors.chipBg, opacity: count === 0 ? 0.4 : 1 }]}
                >
                  <Minus size={16} color={colors.textSecondary} strokeWidth={2} />
                </PressableScale>
                <TextInput
                  value={String(count)}
                  onChangeText={t => setCount(prayer, parseInt(t.replace(/\D/g, ''), 10) || 0)}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  accessibilityLabel={`${prayer.name} count`}
                  style={[styles.count, { color: colors.textPrimary, backgroundColor: colors.card }]}
                />
                <PressableScale
                  onPress={() => setCount(prayer, count + 1)}
                  disabled={count >= prayer.pending}
                  accessibilityLabel={`One more ${prayer.name}`}
                  style={[styles.stepButton, { backgroundColor: colors.primaryAccent, opacity: count >= prayer.pending ? 0.4 : 1 }]}
                >
                  <Plus size={16} color={colors.onAccent} strokeWidth={2} />
                </PressableScale>
              </View>
            </View>
          );
        })
      )}

      <PressableScale
        onPress={confirm}
        haptic="none"
        disabled={total === 0}
        accessibilityRole="button"
        style={[styles.confirm, { backgroundColor: colors.primaryAccent, opacity: total === 0 ? 0.4 : 1 }]}
      >
        <Text style={[styles.confirmText, { color: colors.onAccent }]}>
          {total === 0 ? 'Choose prayers' : `Log ${total} ${total === 1 ? 'prayer' : 'prayers'}`}
        </Text>
      </PressableScale>
    </KazaSheet>
  );
};

const styles = StyleSheet.create({
  dayRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  dayChip: { paddingHorizontal: 16, minHeight: 44, justifyContent: 'center', borderRadius: 999 },
  dayChipText: { fontSize: 13, fontFamily: 'Satoshi-Bold' },
  empty: { fontSize: 14, fontFamily: 'Satoshi-Medium', paddingVertical: 24, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, marginBottom: 8, borderRadius: 16 },
  rowInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontFamily: 'Satoshi-Bold' },
  nextTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  nextText: { fontSize: 11, fontFamily: 'Satoshi-Medium' },
  pending: { fontSize: 12, fontFamily: 'Satoshi-Regular', marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  count: { minWidth: 56, borderRadius: 16, paddingVertical: 8, textAlign: 'center', fontSize: 18, fontFamily: 'Satoshi-Black', padding: 0 },
  confirm: { borderRadius: 999, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  confirmText: { fontSize: 15, fontFamily: 'Satoshi-Bold' },
});
