import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CircleCheck, Flame, Moon } from 'lucide-react-native';
import { useKazaTheme } from '../../theme/kazaTheme';
import { PressableScale } from '../anim';
import { KazaFill } from './KazaFill';
import type { StreakInfo } from '../../services/kazaStreak';

interface Props {
  streak: StreakInfo;
  madeUpToday: number;
  dailyGoal: number;
  /** Today is a rest day: the streak is paused. */
  resting: boolean;
  onRest: () => void;
  onEndRest: () => void;
}

const statusFor = (streak: StreakInfo, resting: boolean): { text: string; tone: 'good' | 'calm' | 'warn' } => {
  if (resting) return { text: 'Resting — your streak is paused, nothing is lost.', tone: 'calm' };
  if (streak.loggedToday) return { text: 'Done for today. Keep it up.', tone: 'good' };
  if (streak.graceUsedYesterday) {
    return { text: 'Yesterday was covered by your free rest day. Make up one prayer to keep going.', tone: 'warn' };
  }
  if (streak.atRisk) return { text: 'Make up one prayer today to keep your streak.', tone: 'warn' };
  if (streak.broken) {
    return {
      text: `Welcome back. Your best is ${streak.longest} ${streak.longest === 1 ? 'day' : 'days'} — one prayer today starts a new streak.`,
      tone: 'calm',
    };
  }
  return { text: 'Make up one prayer to start your streak.', tone: 'calm' };
};

export const KazaStreakCard: React.FC<Props> = ({ streak, madeUpToday, dailyGoal, resting, onRest, onEndRest }) => {
  const { colors, cardRadius, cardShadow, iconShadow } = useKazaTheme();
  const status = statusFor(streak, resting);
  const HeaderIcon = resting ? Moon : Flame;
  const iconColor = streak.current > 0 && !resting ? colors.warning : colors.textSecondary;
  const goalMet = madeUpToday >= dailyGoal;
  const goalPercent = Math.min(100, (dailyGoal > 0 ? madeUpToday / dailyGoal : 0) * 100);
  const showMonths = streak.current >= 30;
  const count = showMonths ? Math.floor(streak.current / 30) : streak.current;
  const unit = showMonths ? 'month' : 'day';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderRadius: cardRadius }, cardShadow]}>
      <View style={styles.topRow}>
        <View
          style={styles.streakWrap}
          accessible
          accessibilityLabel={`${streak.current} day streak. Best ${streak.longest} days.`}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.chipBg }, iconShadow]}>
            <HeaderIcon size={20} color={iconColor} strokeWidth={2} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.streakTitle, { color: colors.textPrimary }]}>{`${count} ${unit} streak`}</Text>
            <View style={styles.statusRow}>
              {streak.loggedToday && <CircleCheck size={16} color={colors.success} strokeWidth={2.2} />}
              <Text style={[styles.statusText, { color: colors.textSecondary }]} numberOfLines={2}>
                {status.text}
              </Text>
            </View>
          </View>
        </View>
        <PressableScale
          onPress={resting ? onEndRest : onRest}
          style={[styles.restButton, { backgroundColor: colors.chipBg }]}
          accessibilityRole="button"
          accessibilityLabel={resting ? 'End rest' : 'Take a rest day'}
        >
          <Moon size={16} color={colors.textPrimary} strokeWidth={2} />
          <Text style={[styles.restText, { color: colors.textPrimary }]}>{resting ? 'End rest' : 'Rest'}</Text>
        </PressableScale>
      </View>

      <View style={styles.goalRow}>
        <KazaFill
          percent={goalPercent}
          color={goalMet ? colors.success : colors.primaryAccent}
          trackColor={colors.chipBg}
          height={6}
        />
        <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>
          {goalMet ? `Goal met · ${madeUpToday} today` : `Today ${madeUpToday} of ${dailyGoal}`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1 },
  streakTitle: { fontSize: 16, fontFamily: 'Satoshi-Black' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { flexShrink: 1, fontSize: 14, fontFamily: 'Satoshi-Regular' },
  restButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  restText: { fontSize: 14, fontFamily: 'Satoshi-Medium' },
  goalRow: { marginTop: 12, gap: 8 },
  goalLabel: { fontSize: 12, fontFamily: 'Satoshi-Regular' },
});
