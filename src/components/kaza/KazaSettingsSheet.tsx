import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import {
  Bell,
  BookPlus,
  Calculator,
  ChevronRight,
  Clock,
  Info,
  Minus,
  Plus,
  SlidersHorizontal,
  Target,
} from 'lucide-react-native';
import { useKazaTheme } from '../../theme/kazaTheme';
import { PressableScale } from '../anim';
import { KazaSheet } from './KazaSheet';

interface Props {
  visible: boolean;
  dailyGoal: number;
  includeWitr: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
  onClose: () => void;
  onChangeGoal: (delta: number) => void;
  onToggleWitr: (value: boolean) => void;
  onToggleReminder: (value: boolean) => void;
  onOpenCalculator: () => void;
  onOpenAdjust: () => void;
  onOpenTime: () => void;
  onOpenAbout: () => void;
}

const to12h = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${
    h >= 12 ? 'PM' : 'AM'
  }`;
};

/** Grouped like Android settings: what you track, then how you are reminded. */
export const KazaSettingsSheet: React.FC<Props> = ({
  visible,
  dailyGoal,
  includeWitr,
  reminderEnabled,
  reminderTime,
  onClose,
  onChangeGoal,
  onToggleWitr,
  onToggleReminder,
  onOpenCalculator,
  onOpenAdjust,
  onOpenTime,
  onOpenAbout,
}) => {
  const { colors } = useKazaTheme();
  const track = { false: `${colors.textSecondary}55`, true: colors.success };

  const group = (title: string, rows: React.ReactNode) => (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.sectionLabel }]}>
        {title}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {rows}
      </View>
    </View>
  );

  const row = (
    icon: React.ReactNode,
    label: string,
    opts: { onPress?: () => void; right?: React.ReactNode; last?: boolean },
  ) => {
    const body = (
      <>
        <View style={[styles.icon, { backgroundColor: colors.chipBg }]}>
          {icon}
        </View>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {label}
        </Text>
        {opts.right}
      </>
    );
    const style = [
      styles.row,
      !opts.last && {
        borderBottomColor: colors.border,
        borderBottomWidth: StyleSheet.hairlineWidth,
      },
    ];
    return opts.onPress ? (
      <PressableScale
        onPress={opts.onPress}
        accessibilityRole="button"
        style={style}
      >
        {body}
      </PressableScale>
    ) : (
      <View style={style}>{body}</View>
    );
  };

  const ic = (Icon: typeof Bell) => (
    <Icon size={18} color={colors.textPrimary} strokeWidth={2} />
  );
  const chevron = (
    <ChevronRight size={20} color={colors.textSecondary} strokeWidth={2} />
  );

  return (
    <KazaSheet visible={visible} title="Kaza settings" onClose={onClose}>
      {group(
        'Your Kaza',
        <>
          {row(ic(Calculator), 'Calculate my Kaza', {
            onPress: onOpenCalculator,
            right: chevron,
          })}
          {row(ic(SlidersHorizontal), "Adjust what's left", {
            onPress: onOpenAdjust,
            right: chevron,
          })}
          {row(ic(Target), 'Daily goal', {
            right: (
              <View style={styles.stepperGroup}>
                <PressableScale
                  onPress={() => onChangeGoal(-1)}
                  accessibilityLabel="Lower goal"
                  style={[styles.stepper, { backgroundColor: colors.chipBg }]}
                >
                  <Minus
                    size={16}
                    color={colors.textPrimary}
                    strokeWidth={2.2}
                  />
                </PressableScale>
                <Text style={[styles.goal, { color: colors.textPrimary }]}>
                  {dailyGoal}
                </Text>
                <PressableScale
                  onPress={() => onChangeGoal(1)}
                  accessibilityLabel="Raise goal"
                  style={[styles.stepper, { backgroundColor: colors.chipBg }]}
                >
                  <Plus size={16} color={colors.textPrimary} strokeWidth={2.2} />
                </PressableScale>
              </View>
            ),
          })}
          {row(ic(BookPlus), 'Include Witr (Hanafi)', {
            last: true,
            right: (
              <Switch
                accessibilityLabel="Include Witr"
                value={includeWitr}
                onValueChange={onToggleWitr}
                trackColor={track}
                thumbColor="#FFFFFF"
              />
            ),
          })}
        </>,
      )}

      {group(
        'Reminders',
        <>
          {row(ic(Bell), 'Daily reminder and streak alerts', {
            right: (
              <Switch
                accessibilityLabel="Reminders and streak alerts"
                value={reminderEnabled}
                onValueChange={onToggleReminder}
                trackColor={track}
                thumbColor="#FFFFFF"
              />
            ),
          })}
          {row(ic(Clock), 'Reminder time', {
            onPress: onOpenTime,
            last: true,
            right: (
              <Text style={[styles.value, { color: colors.textSecondary }]}>
                {to12h(reminderTime)}
              </Text>
            ),
          })}
        </>,
      )}

      {group(
        'Help',
        row(ic(Info), 'About Kaza', {
          onPress: onOpenAbout,
          last: true,
          right: chevron,
        }),
      )}
    </KazaSheet>
  );
};

const styles = StyleSheet.create({
  group: { marginBottom: 16 },
  groupTitle: {
    fontSize: 12,
    fontFamily: 'Satoshi-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 8,
  },
  card: { borderRadius: 20, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: 16,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  label: { flex: 1, fontSize: 16, fontFamily: 'Satoshi-Medium' },
  value: { fontSize: 14, fontFamily: 'Satoshi-Medium' },
  stepperGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goal: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Satoshi-Black',
  },
});
