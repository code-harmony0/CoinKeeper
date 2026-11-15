import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useKazaTheme } from '../../theme/kazaTheme';
import { PressableScale } from '../anim';
import { KazaSheet } from './KazaSheet';

interface Props {
  visible: boolean;
  /** "HH:MM", 24-hour. */
  value: string;
  onClose: () => void;
  onSave: (time: string) => void;
}

const PRESETS: { label: string; time: string }[] = [
  { label: 'Morning', time: '07:30' },
  { label: 'Afternoon', time: '14:00' },
  { label: 'Evening', time: '19:00' },
  { label: 'Night', time: '21:30' },
];

const STEP_MINUTES = 15;
const DAY_MINUTES = 24 * 60;

const pad2 = (n: number) => n.toString().padStart(2, '0');
const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const fromMinutes = (total: number) => {
  const wrapped = ((total % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return `${pad2(Math.floor(wrapped / 60))}:${pad2(wrapped % 60)}`;
};
const display = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${pad2(m)} ${suffix}`;
};

/**
 * Edits a draft: closing the sheet without saving leaves the saved reminder
 * untouched. One stepper moves the time in 15-minute steps (carrying the
 * hour), and presets cover the common choices in a single tap.
 */
export const KazaTimeSheet: React.FC<Props> = ({
  visible,
  value,
  onClose,
  onSave,
}) => {
  const { colors } = useKazaTheme();
  const [draft, setDraft] = useState(value);

  // Start each opening from the saved time.
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const step = (direction: 1 | -1) =>
    setDraft(prev => fromMinutes(toMinutes(prev) + direction * STEP_MINUTES));

  return (
    <KazaSheet visible={visible} title="Daily reminder" onClose={onClose}>
      <View style={styles.stepperRow}>
        <PressableScale
          onPress={() => step(-1)}
          accessibilityLabel="15 minutes earlier"
          style={[styles.stepper, { backgroundColor: colors.chipBg }]}
        >
          <Minus size={20} color={colors.textPrimary} strokeWidth={2.2} />
        </PressableScale>
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.time, { color: colors.textPrimary }]}
        >
          {display(draft)}
        </Text>
        <PressableScale
          onPress={() => step(1)}
          accessibilityLabel="15 minutes later"
          style={[styles.stepper, { backgroundColor: colors.chipBg }]}
        >
          <Plus size={20} color={colors.textPrimary} strokeWidth={2.2} />
        </PressableScale>
      </View>

      <View style={styles.presets}>
        {PRESETS.map(p => {
          const active = draft === p.time;
          return (
            <PressableScale
              key={p.time}
              onPress={() => setDraft(p.time)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primaryAccent : colors.chipBg,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? colors.onAccent : colors.textPrimary },
                ]}
              >
                {p.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <PressableScale
        onPress={() => {
          onSave(draft);
          onClose();
        }}
        haptic="none"
        accessibilityRole="button"
        style={[styles.save, { backgroundColor: colors.primaryAccent }]}
      >
        <Text style={[styles.saveText, { color: colors.onAccent }]}>Save</Text>
      </PressableScale>
    </KazaSheet>
  );
};

const styles = StyleSheet.create({
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  stepper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: { fontSize: 40, lineHeight: 48, fontFamily: 'Satoshi-Black' },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 999,
    justifyContent: 'center',
  },
  chipText: { fontSize: 14, fontFamily: 'Satoshi-Bold' },
  save: {
    borderRadius: 999,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontSize: 16, fontFamily: 'Satoshi-Bold' },
});
