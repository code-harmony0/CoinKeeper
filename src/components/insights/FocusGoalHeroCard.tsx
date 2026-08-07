import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring
} from 'react-native-reanimated';
import { Target, Plus, AlertTriangle } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim/PressableScale';
import { Money } from '../../utils/money';
import { GoalHealth } from '../../services/goalIntelligence';

interface Props {
  name: string;
  targetAmount: number;
  currentAmount: number;
  tint: string;
  deep: string;
  onAddFunds: () => void;
  onPress: () => void;
  health: GoalHealth;
  priorityRank: number;
}

export const FocusGoalHeroCard: React.FC<Props> = ({
  name,
  targetAmount,
  currentAmount,
  tint,
  deep,
  onAddFunds,
  onPress,
  health,
  priorityRank
}) => {
  const { colors, cardRadius, cardShadow, iconShadow, iconContainerRadius, space, spring } = useSpecTheme();

  const percentage = health.progressPercent;
  const isComplete = health.state === 'completed';
  
  const fillWidth = useSharedValue(0);
  
  useEffect(() => {
    fillWidth.value = withSpring(percentage, spring);
  }, [percentage, spring]);
  
  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value}%`
  }));

  return (
    <PressableScale onPress={onPress}>
      <View style={[
        styles.card, 
        cardShadow,
        { 
          backgroundColor: colors.card,
          borderRadius: cardRadius,
          padding: space.md,
        }
      ]}>
        
        <View style={[styles.header, { marginBottom: space.md }]}>
          <View style={styles.badgeRow}>
            <View style={[
              styles.iconWrap, 
              iconShadow,
              { 
                backgroundColor: isComplete ? colors.success : tint,
                borderRadius: iconContainerRadius
              }
            ]}>
              <Target color={isComplete ? '#FFFFFF' : deep} size={20} />
            </View>
            {priorityRank === 1 && (
              <View style={[styles.priorityBadge, { backgroundColor: colors.chipBg }]}>
                <Text variant="label" style={{ color: colors.primaryAccent, fontFamily: 'Satoshi-Bold' }}>#1 Priority</Text>
              </View>
            )}
          </View>
          
          <Text variant="h2" style={{ color: colors.textPrimary, marginTop: space.sm }}>{name}</Text>
        </View>

        <View style={[styles.progressSection, { marginBottom: space.md }]}>
          <View style={[styles.progressRow, { marginBottom: space.xs }]}>
            <View>
              <Text variant="label" style={{ color: colors.textSecondary }}>Saved</Text>
              <Text style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Black', fontSize: 28, marginTop: 4 }}>
                {Money.format(currentAmount, { zeroDecimals: true })}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', justifyContent: 'flex-end' }}>
              <Text variant="label" style={{ color: colors.textSecondary }}>Target</Text>
              <Text style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium', fontSize: 16, marginTop: 4 }}>
                {Money.format(targetAmount, { zeroDecimals: true })}
              </Text>
            </View>
          </View>

          <View style={[styles.track, { backgroundColor: colors.chipBg }]}>
            <Animated.View style={[
              styles.fill, 
              { backgroundColor: isComplete ? colors.success : deep },
              fillStyle
            ]} />
          </View>
        </View>

        <View style={styles.footerRow}>
          {isComplete ? (
            <View style={[styles.completeBadge, { backgroundColor: colors.success }]}>
              <Text variant="caption" style={{ color: '#FFFFFF', fontFamily: 'Satoshi-Bold' }}>Goal Achieved</Text>
            </View>
          ) : (
            <>
              {health.state === 'stalled' && (
                <Text variant="caption" style={{ color: colors.textSecondary }}>
                  No contribution in {Number.isFinite(health.daysSinceLastContribution) ? `${health.daysSinceLastContribution} days` : 'a while'}
                </Text>
              )}
              {health.state === 'at_risk' && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AlertTriangle color={colors.danger} size={14} />
                  <Text variant="caption" style={{ color: colors.danger, marginLeft: 4 }}>Behind pace for its deadline</Text>
                </View>
              )}
              {health.state === 'overdue' && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AlertTriangle color={colors.danger} size={14} />
                  <Text variant="caption" style={{ color: colors.danger, marginLeft: 4 }}>Past deadline</Text>
                </View>
              )}
              {health.state === 'healthy' && (
                <Text variant="caption" style={{ color: colors.textSecondary }}>
                  {health.etaLabel ? health.etaLabel : `${percentage}% completed`}
                </Text>
              )}

              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primaryAccent }]} 
                onPress={onAddFunds}
                activeOpacity={0.8}
              >
                <Plus color="#FFFFFF" size={16} />
                <Text variant="caption" style={{ color: '#FFFFFF', fontFamily: 'Satoshi-Bold', marginLeft: 4 }}>Add Funds</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 0,
  },
  header: {},
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  progressSection: {},
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  completeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  }
});
