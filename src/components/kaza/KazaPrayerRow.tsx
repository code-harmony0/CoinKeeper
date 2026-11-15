import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CircleCheck, Minus, Plus } from 'lucide-react-native';
import { PRAYER_TINT, useKazaTheme } from '../../theme/kazaTheme';
import { KazaFill } from './KazaFill';
import { PressableScale } from '../anim';

interface Props {
  prayer: { name: string; arabic: string; completed: number; pending: number };
  isLast: boolean;
  isNext: boolean;
  isMostBehind: boolean;
  onPlus: () => void;
  onMinus: () => void;
}

const MIN_FILL_PERCENT = 2.5;

export const KazaPrayerRow: React.FC<Props> = ({
  prayer,
  isLast,
  isNext,
  isMostBehind,
  onPlus,
  onMinus,
}) => {
  const { colors } = useKazaTheme();
  const { name, completed, pending } = prayer;
  const hue = PRAYER_TINT[name] ?? 'lavender';
  const hueFill = colors[hue];
  const hueDeep = colors[`${hue}Deep` as const];
  const total = completed + pending;
  const ratio = total > 0 ? completed / total : 0;
  const isComplete = pending === 0 && completed > 0;
  const fillPercent =
    completed > 0 ? Math.max(MIN_FILL_PERCENT, ratio * 100) : 0;
  const minusDisabled = completed === 0;
  const plusDisabled = pending === 0;

  return (
    <View
      style={[
        styles.row,
        !isLast && {
          borderBottomColor: colors.inputBg,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={styles.line}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.hourDot,
              { backgroundColor: hueFill, borderColor: hueDeep },
            ]}
          />
          <Text
            style={[
              styles.name,
              { color: isComplete ? colors.success : colors.textPrimary },
            ]}
          >
            {name}
          </Text>
          {isComplete && (
            <CircleCheck size={16} color={colors.success} strokeWidth={2.2} />
          )}
          {isNext && (
            <View style={[styles.tag, { backgroundColor: colors.chipBg }]}>
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                Next
              </Text>
            </View>
          )}
          {isMostBehind && (
            <View style={[styles.tag, { backgroundColor: colors.chipBg }]}>
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                Most to go
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Text style={[styles.count, { color: colors.textPrimary }]}>
            {isComplete
              ? 'All made up'
              : `${pending.toLocaleString('en-IN')} left`}
          </Text>
          <PressableScale
            onPress={onMinus}
            disabled={minusDisabled}
            hitSlop={4}
            style={[
              styles.minus,
              { backgroundColor: colors.chipBg },
              minusDisabled && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Undo one ${name}`}
          >
            <Minus size={18} color={colors.textSecondary} strokeWidth={2.4} />
          </PressableScale>
          <PressableScale
            onPress={onPlus}
            disabled={plusDisabled}
            hitSlop={4}
            style={[
              styles.plus,
              { backgroundColor: colors.primaryAccent },
              plusDisabled && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Made up one ${name}`}
          >
            <Plus size={20} color={colors.onAccent} strokeWidth={2.4} />
          </PressableScale>
        </View>
      </View>

      <View
        style={styles.bar}
        accessible
        accessibilityLabel={`${name}: ${completed} made up, ${pending} left`}
      >
        <KazaFill
          percent={fillPercent}
          color={isComplete ? colors.success : hueDeep}
          trackColor={colors.chipBg}
          height={6}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { paddingVertical: 12 },
  line: { flexDirection: 'row', alignItems: 'center' },
  titleRow: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  hourDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  name: { fontSize: 16, fontFamily: 'Satoshi-Bold' },
  tag: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    justifyContent: 'center',
  },
  tagText: { fontSize: 12, fontFamily: 'Satoshi-Medium' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
    paddingLeft: 12,
  },
  count: { fontSize: 16, fontFamily: 'Satoshi-Black' },
  minus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: { marginTop: 4 },
  disabled: { opacity: 0.4 },
});
