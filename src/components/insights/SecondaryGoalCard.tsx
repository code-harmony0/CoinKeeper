import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring
} from 'react-native-reanimated';
import { Crosshair } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim/PressableScale';
import { Money } from '../../utils/money';
import { GoalHealth, goalBarTone, goalStatusCopy, goalTone, isUnstarted } from '../../services/goalIntelligence';
import { INFORMATIONAL, SPRING } from '../../theme/motion';

interface Props {
  name: string;
  targetAmount: number;
  currentAmount: number;
  themeColor: string;
  onPress: () => void;
  onLongPress?: () => void;
  health: GoalHealth;
}

export const SecondaryGoalCard: React.FC<Props> = ({
  name,
  targetAmount,
  currentAmount,
  themeColor,
  onPress,
  onLongPress,
  health,
}) => {
  const { colors, cardRadius, cardShadow, iconShadow, iconContainerRadius } = useSpecTheme();

  const percentage = health.progressPercent;
  const unstarted = isUnstarted(health);

  const fillWidth = useSharedValue(0);

  useEffect(() => {
    // The bar IS the percentage, so it shortens under reduce-motion rather
    // than snapping — it carried no reduceMotion policy at all before.
    fillWidth.value = withSpring(percentage, { ...SPRING.settle, reduceMotion: INFORMATIONAL });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value}%`
  }));

  // The status line carries the verdict; an unstarted goal is an invitation
  // rather than a warning and stays on its own ink.
  const tone = unstarted ? 'accent' : goalTone(health.state);
  const statusColor =
    tone === 'good' ? colors.success
    : tone === 'warn' ? colors.warning
    : tone === 'bad' ? colors.danger
    : themeColor;

  // The bar and the percentage measure fullness, not health — driving them
  // from status turned every drifting goal amber at once and erased the accent
  // rotation that tells these cards apart.
  const barTone = goalBarTone(health.state);
  const accentColor =
    barTone === 'good' ? colors.success
    : barTone === 'bad' ? colors.danger
    : themeColor;

  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${Money.format(currentAmount, { zeroDecimals: true })} of ${Money.format(targetAmount, { zeroDecimals: true })}, ${percentage} percent. ${goalStatusCopy(health)}`}
    >
      <View style={[
        styles.card,
        cardShadow,
        {
          backgroundColor: colors.card,
          borderRadius: cardRadius,
        }
      ]}>

        <View style={styles.contentRow}>
          <View style={[styles.iconWrap, iconShadow, { backgroundColor: `${accentColor}15`, borderRadius: iconContainerRadius }]}>
            <Crosshair color={accentColor} size={20} />
          </View>
          
          <View style={styles.infoCol}>
            <Text variant="h3" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold', marginBottom: 2 }} numberOfLines={1}>{name}</Text>
            <Text variant="caption" style={{ color: colors.textSecondary }}>
              {Money.format(currentAmount, { zeroDecimals: true })} / {Money.format(targetAmount, { zeroDecimals: true })}
            </Text>
          </View>

          <View style={styles.percentCol}>
            <Text variant="h3" style={{ color: accentColor, fontFamily: 'Satoshi-Black' }}>{percentage}%</Text>
          </View>
        </View>

        {health.state === 'completed' ? (
          <View style={[styles.completeBadge, { backgroundColor: colors.success }]}>
            <Text variant="label" style={{ color: '#FFFFFF' }}>Complete</Text>
          </View>
        ) : (
          <Text
            variant="caption"
            numberOfLines={1}
            style={{ color: tone === 'accent' ? colors.textSecondary : statusColor, marginTop: 4, marginBottom: 8 }}
          >
            {goalStatusCopy(health)}
          </Text>
        )}

        {/* Dashed slot rather than a solid empty bar — see FocusGoalHeroCard. */}
        <View style={[
          styles.track,
          unstarted
            ? { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border }
            : { backgroundColor: colors.chipBg },
        ]}>
          {!unstarted && (
            <Animated.View style={[styles.fill, { backgroundColor: accentColor }, fillStyle]} />
          )}
        </View>
        
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  percentCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 12,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  completeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 4,
  },
});
