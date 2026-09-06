/**
 * BadgeCelebration — the one moment a badge gets.
 *
 * An overlay rather than a modal: nothing here needs a decision or protected
 * focus, so it must never block the app. It dismisses on tap and on its own
 * after a few seconds, and it fires exactly once per badge (the record lives
 * in services/badges).
 *
 * Confetti is hand-rolled from twelve views because a particle library for
 * twelve particles is a dependency you'd carry forever for one screen-second.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Flame, Medal, PiggyBank, Target, Trophy } from 'lucide-react-native';
import { useSpecTheme, specLight } from '../../theme/specTheme';
import type { Badge } from '../../services/badges';

const ICONS = { Flame, Trophy, Medal, PiggyBank, Target };
const CONFETTI_COLORS = [
  specLight.lavenderDeep,
  specLight.pinkDeep,
  specLight.mintDeep,
  specLight.peachDeep,
  specLight.skyDeep,
];

const SCREEN_W = Dimensions.get('window').width;
const PARTICLES = 12;
const VISIBLE_MS = 3200;

interface Props {
  badge: Badge | null;
  onDismiss: () => void;
}

const Particle: React.FC<{ index: number }> = ({ index }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      120 + index * 24,
      withTiming(1, {
        duration: 900,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [index, progress]);

  // Fan out across the card's width, arcing up then falling.
  const spread = (index / (PARTICLES - 1) - 0.5) * Math.min(SCREEN_W - 80, 300);
  const peak = -70 - (index % 4) * 22;

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: 1 - t * t,
      transform: [
        { translateX: spread * t },
        { translateY: peak * t + 130 * t * t },
        { rotate: `${t * (index % 2 === 0 ? 260 : -260)}deg` },
        { scale: 1 - t * 0.35 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        { backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length] },
        style,
      ]}
    />
  );
};

export const BadgeCelebration: React.FC<Props> = ({ badge, onDismiss }) => {
  const { colors, cardRadius, cardShadow } = useSpecTheme();
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!badge) return;

    ReactNativeHapticFeedback.trigger('notificationSuccess');

    opacity.value = withTiming(1, {
      duration: 180,
      reduceMotion: ReduceMotion.System,
    });
    scale.value = withSequence(
      withSpring(1.06, {
        damping: 11,
        stiffness: 220,
        reduceMotion: ReduceMotion.System,
      }),
      withSpring(1, {
        damping: 16,
        stiffness: 180,
        reduceMotion: ReduceMotion.System,
      }),
    );

    // Auto-dismiss, so a celebration never becomes something to clear.
    opacity.value = withDelay(
      VISIBLE_MS,
      withTiming(
        0,
        { duration: 260, reduceMotion: ReduceMotion.System },
        finished => {
          if (finished) runOnJS(onDismiss)();
        },
      ),
    );
  }, [badge, onDismiss, opacity, scale]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!badge) return null;

  const Icon = ICONS[badge.icon];

  return (
    <View style={styles.layer} pointerEvents="box-none">
      <Animated.View style={cardStyle}>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={`Badge earned: ${badge.label}. ${badge.earnedFor} Dismiss`}
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderRadius: cardRadius,
              ...cardShadow,
            },
          ]}
        >
          <View style={styles.burst} pointerEvents="none">
            {Array.from({ length: PARTICLES }, (_, i) => (
              <Particle key={i} index={i} />
            ))}
          </View>

          <View style={[styles.medal, { backgroundColor: colors.peach }]}>
            <Icon size={26} color={colors.peachDeep} strokeWidth={2.2} />
          </View>
          <Text style={[styles.eyebrowless, { color: colors.textPrimary }]}>
            {badge.label}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {badge.earnedFor}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 32,
  },
  burst: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    width: 7,
    height: 11,
    borderRadius: 2,
  },
  medal: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  eyebrowless: {
    fontSize: 22,
    fontFamily: 'Satoshi-Black',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Satoshi-Regular',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default BadgeCelebration;
