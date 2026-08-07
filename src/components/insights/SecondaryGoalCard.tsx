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
import { GoalHealth } from '../../services/goalIntelligence';

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
  const isComplete = health.state === 'completed';

  const fillWidth = useSharedValue(0);
  
  useEffect(() => {
    fillWidth.value = withSpring(percentage, { damping: 20, stiffness: 90 });
  }, [percentage]);
  
  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value}%`
  }));

  const accentColor = isComplete ? colors.success : themeColor;

  return (
    <PressableScale onPress={onPress} onLongPress={onLongPress}>
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
        ) : health.state === 'stalled' ? (
          <Text variant="caption" style={{ color: colors.textSecondary, marginTop: 4 }}>
            No contribution in {Number.isFinite(health.daysSinceLastContribution) ? `${health.daysSinceLastContribution} days` : 'a while'}
          </Text>
        ) : (health.state === 'at_risk' || health.state === 'overdue') ? (
          <Text variant="caption" style={{ color: colors.danger, marginTop: 4 }}>
            {health.state === 'overdue' ? 'Past deadline' : 'Behind pace'}
          </Text>
        ) : null}

        <View style={[styles.track, { backgroundColor: colors.chipBg }]}>
          <Animated.View style={[
            styles.fill, 
            { backgroundColor: accentColor },
            fillStyle
          ]} />
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
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  completeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 4,
  },
});
