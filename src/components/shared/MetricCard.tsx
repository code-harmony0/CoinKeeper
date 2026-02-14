/**
 * MetricCard - Reusable premium card component with patterns and animations
 * Award-winning fintech design system
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Defs, Pattern, Rect } from 'react-native-svg';
import { theme } from '../../theme';

type PatternVariant = 'circle' | 'wave' | 'dot' | 'grid';
type AnimationVariant = 'none' | 'mount' | 'pulse' | 'hover';
type SizeVariant = 'small' | 'large';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  description?: string;
  color?: string;
  patternVariant?: PatternVariant;
  animationVariant?: AnimationVariant;
  size?: SizeVariant;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  description,
  color = '#C2DFF7',
  patternVariant = 'circle',
  animationVariant = 'mount',
  size = 'large',
  onPress,
}) => {
  const scale = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pressed = useSharedValue(0);

  React.useEffect(() => {
    // Mount animation
    if (animationVariant === 'mount') {
      scale.value = withSpring(1, {
        damping: 12,
        stiffness: 100,
      });
    } else {
      scale.value = 1;
    }

    // Pulse animation
    if (animationVariant === 'pulse') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    }
  }, [animationVariant]);

  const animatedCardStyle = useAnimatedStyle(() => {
    const mountScale = animationVariant === 'mount' ? scale.value : 1;
    const currentPulse = animationVariant === 'pulse' ? pulseScale.value : 1;
    const pressScale = interpolate(
      pressed.value,
      [0, 1],
      [1, 0.97],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale: mountScale * currentPulse * pressScale }],
      opacity: animationVariant === 'mount' ? scale.value : 1,
    };
  });

  const handlePressIn = () => {
    if (animationVariant === 'hover') {
      pressed.value = withSpring(1, { damping: 15 });
    }
  };

  const handlePressOut = () => {
    if (animationVariant === 'hover') {
      pressed.value = withSpring(0, { damping: 15 });
    }
  };

  const renderPattern = () => {
    const patternSize = size === 'small' ? 60 : 100;

    switch (patternVariant) {
      case 'circle':
        return (
          <Svg
            height={patternSize}
            width={patternSize}
            style={styles.pattern}
          >
            <Defs>
              <Pattern
                id="circlePattern"
                patternUnits="userSpaceOnUse"
                width="20"
                height="20"
              >
                <Circle
                  cx="10"
                  cy="10"
                  r="1.5"
                  fill="#121723"
                  opacity="0.05"
                />
              </Pattern>
            </Defs>
            <Rect
              width={patternSize}
              height={patternSize}
              fill="url(#circlePattern)"
            />
          </Svg>
        );

      case 'wave':
        return (
          <Svg
            height={patternSize}
            width={patternSize}
            style={styles.pattern}
          >
            <Defs>
              <Pattern
                id="wavePattern"
                patternUnits="userSpaceOnUse"
                width="40"
                height="20"
              >
                <Path
                  d="M0 10 Q10 5, 20 10 T40 10"
                  stroke="#121723"
                  strokeWidth="1"
                  fill="none"
                  opacity="0.06"
                />
              </Pattern>
            </Defs>
            <Rect
              width={patternSize}
              height={patternSize}
              fill="url(#wavePattern)"
            />
          </Svg>
        );

      case 'dot':
        return (
          <Svg
            height={patternSize}
            width={patternSize}
            style={styles.pattern}
          >
            <Defs>
              <Pattern
                id="dotPattern"
                patternUnits="userSpaceOnUse"
                width="15"
                height="15"
              >
                <Circle cx="2" cy="2" r="1" fill="#121723" opacity="0.08" />
              </Pattern>
            </Defs>
            <Rect
              width={patternSize}
              height={patternSize}
              fill="url(#dotPattern)"
            />
          </Svg>
        );

      case 'grid':
        return (
          <Svg
            height={patternSize}
            width={patternSize}
            style={styles.pattern}
          >
            <Defs>
              <Pattern
                id="gridPattern"
                patternUnits="userSpaceOnUse"
                width="20"
                height="20"
              >
                <Path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="#121723"
                  strokeWidth="0.5"
                  opacity="0.06"
                />
              </Pattern>
            </Defs>
            <Rect
              width={patternSize}
              height={patternSize}
              fill="url(#gridPattern)"
            />
          </Svg>
        );

      default:
        return null;
    }
  };

  const isSmall = size === 'small';

  return (
    <AnimatedPressable
      style={[
        styles.card,
        isSmall ? styles.cardSmall : styles.cardLarge,
        { backgroundColor: color },
        animatedCardStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
    >
      {/* Pattern Background */}
      <View style={styles.patternContainer}>{renderPattern()}</View>

      {/* Icon Container */}
      <View
        style={[
          styles.iconContainer,
          isSmall ? styles.iconContainerSmall : styles.iconContainerLarge,
        ]}
      >
        {icon}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            isSmall ? styles.titleSmall : styles.titleLarge,
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.value,
            isSmall ? styles.valueSmall : styles.valueLarge,
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>

        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}

        {description && !isSmall && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#121723',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardSmall: {
    minHeight: 140,
  },
  cardLarge: {
    minHeight: 180,
  },
  patternContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    overflow: 'hidden',
  },
  pattern: {
    opacity: 1,
  },
  iconContainer: {
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#121723',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainerSmall: {
    width: 48,
    height: 48,
  },
  iconContainerLarge: {
    width: 56,
    height: 56,
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    color: '#121723',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  titleSmall: {
    fontSize: 14,
  },
  titleLarge: {
    fontSize: 16,
  },
  value: {
    fontWeight: '700',
    color: '#121723',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  valueSmall: {
    fontSize: 24,
  },
  valueLarge: {
    fontSize: 28,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#121723',
    opacity: 0.6,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    fontWeight: '400',
    color: '#121723',
    opacity: 0.55,
    lineHeight: 18,
    marginTop: 4,
  },
});
