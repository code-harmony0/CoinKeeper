import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInRight,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Plus } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import {
  DURATION,
  EXPRESSIVE,
  INFORMATIONAL,
  STAGGER,
  informationalDuration,
  useReducedMotion,
} from '../../theme/motion';
import { PressableScale } from '../anim';
import { Money } from '../../utils/money';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface GoalRingItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
}

interface Props {
  goals: GoalRingItem[];
  /** Tapping a ring opens the add-money sheet for that goal. */
  onAddMoney: (goalId: string) => void;
  onNewGoal: () => void;
}

const SIZE = 72;
const STROKE = 7;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

const Ring: React.FC<{ ratio: number; index: number; track: string; ink: string; children: React.ReactNode }> = ({
  ratio,
  index,
  track,
  ink,
  children,
}) => {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(
      200 + index * STAGGER.normal,
      withTiming(Math.min(Math.max(ratio, 0), 1), {
        duration: informationalDuration(DURATION.fill * 2, reduced),
        easing: Easing.bezier(0.32, 0.72, 0, 1),
        reduceMotion: INFORMATIONAL,
      }),
    );
  }, [ratio, index, reduced, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - p.value) }));
  return (
    <View style={styles.ring}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={track} strokeWidth={STROKE} fill="none" />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={ink}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${C} ${C}`}
          rotation={-90}
          origin={`${SIZE / 2}, ${SIZE / 2}`}
          animatedProps={props}
        />
      </Svg>
      {children}
    </View>
  );
};

/** Goals as a row of progress rings with the amount left under each. */
export const GoalRings: React.FC<Props> = ({ goals, onAddMoney, onNewGoal }) => {
  const { colors } = useSpecTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {goals.slice(0, 6).map((g, i) => {
        const ratio = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0;
                const left = Math.max(g.targetAmount - g.currentAmount, 0);
        return (
          <Animated.View
            key={g.id}
            entering={FadeInRight.springify().damping(18).delay(i * STAGGER.tight).reduceMotion(EXPRESSIVE)}
          >
            <PressableScale
              onPress={() => onAddMoney(g.id)}
              accessibilityRole="button"
              accessibilityLabel={`${g.name}, ${Math.round(ratio * 100)} percent saved, ${Money.format(left, { zeroDecimals: true })} left. Add money`}
              style={styles.item}
            >
              <Ring ratio={ratio} index={i} track={colors.border} ink={colors.textPrimary}>
                <Text style={[styles.pct, { color: colors.textPrimary }]}>{Math.round(ratio * 100)}%</Text>
              </Ring>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={2}>
                {g.name}
              </Text>
              <Text style={[styles.left, { color: colors.textSecondary }]} numberOfLines={1}>
                {left === 0 ? 'Done' : `${Money.format(left, { zeroDecimals: true })} left`}
              </Text>
            </PressableScale>
          </Animated.View>
        );
      })}
      <PressableScale onPress={onNewGoal} accessibilityRole="button" accessibilityLabel="New goal" style={styles.item}>
        <View style={[styles.ring, styles.add, { borderColor: colors.border }]}>
          <Plus size={24} color={colors.textSecondary} strokeWidth={1.8} />
        </View>
        <Text style={[styles.name, { color: colors.textPrimary }]}>New</Text>
      </PressableScale>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -24 },
  row: { paddingHorizontal: 24, gap: 16, paddingBottom: 8 },
  item: { width: 88, alignItems: 'center', minHeight: 48 },
  ring: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  add: { borderRadius: SIZE / 2, borderWidth: 1.5, borderStyle: 'dashed' },
  pct: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Black' },
  name: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Bold', marginTop: 8, minHeight: 40, maxWidth: 88, textAlign: 'center' },
  left: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Medium', maxWidth: 88 },
});
