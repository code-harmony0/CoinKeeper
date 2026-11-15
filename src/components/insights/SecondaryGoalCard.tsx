import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Crosshair } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim/PressableScale';
import { IconTile } from '../shared/IconTile';
import { ProgressBar } from '../shared/ProgressBar';
import { Money } from '../../utils/money';
import { GoalHealth, goalStatusCopy, isUnstarted } from '../../services/goalIntelligence';

interface Props {
  name: string;
  targetAmount: number;
  currentAmount: number;
  /** Kept for callers; goals no longer carry their own colour. */
  themeColor?: string;
  /** Hides the hairline under the last row. */
  last?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  health: GoalHealth;
}

/** A goal in the list: flat row, one bar, one status line. */
export const SecondaryGoalCard: React.FC<Props> = ({
  name,
  targetAmount,
  currentAmount,
  last,
  onPress,
  onLongPress,
  health,
}) => {
  const { colors } = useSpecTheme();
  const percentage = health.progressPercent;
  const unstarted = isUnstarted(health);
  const done = health.state === 'completed';

  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${Money.format(currentAmount, { zeroDecimals: true })} of ${Money.format(targetAmount, { zeroDecimals: true })}, ${percentage} percent. ${goalStatusCopy(health)}`}
      style={[styles.row, !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
    >
      <View style={styles.top}>
        <IconTile icon={Crosshair} />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
            {Money.format(currentAmount, { zeroDecimals: true })} of {Money.format(targetAmount, { zeroDecimals: true })}
          </Text>
        </View>
        <Text style={[styles.pct, { color: colors.textPrimary }]}>{done ? 'Done' : `${percentage}%`}</Text>
      </View>
      <ProgressBar ratio={percentage / 100} />
      {!done && (
        <Text style={[styles.status, { color: colors.textSecondary }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
          {goalStatusCopy(health)}
        </Text>
      )}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  row: { paddingVertical: 16, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Bold' },
  sub: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium' },
  pct: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Black' },
  status: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium' },
});
