import React, { useEffect, useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../theme/motion';
import { Money } from '../../utils/money';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const STEP_MS = 70;
const ROLL_MS = 700;

interface Props {
  valuePaise: number;
  fontSize: number;
  lineHeight: number;
  color: string;
  fontFamily?: string;
  letterSpacing?: number;
  prefix?: string;
  /** Bump to roll the whole number in again (pull-to-refresh). */
  replayToken?: number;
  style?: StyleProp<TextStyle>;
}

const Digit: React.FC<{
  digit: number;
  order: number;
  text: TextStyle;
  lineHeight: number;
  replayToken: number;
}> = ({ digit, order, text, lineHeight, replayToken }) => {
  const reduced = useReducedMotion();
  const pos = useSharedValue(reduced ? digit : 0);

  // Leftmost digits start first and the ones digit lands last, like a
  // departures board settling. Reduce-motion jumps straight to the value.
  useEffect(() => {
    if (reduced) {
      pos.value = digit;
      return;
    }
    pos.value = withDelay(
      order * STEP_MS,
      withTiming(digit, { duration: ROLL_MS, easing: Easing.out(Easing.cubic) }),
    );
  }, [digit, order, reduced, pos, replayToken]);

  const strip = useAnimatedStyle(() => ({
    transform: [{ translateY: -pos.value * lineHeight }],
  }));

  return (
    <View
      style={{ height: lineHeight, overflow: 'hidden' }}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Animated.View style={strip}>
        {DIGITS.map(d => (
          <Text key={d} style={[text, { height: lineHeight }]}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
};

/**
 * Money that rolls into place digit by digit. The visible number is built from
 * per-digit strips (transform only), so it never re-lays-out while it moves,
 * and the full value is announced once to screen readers.
 */
export const RollingNumber: React.FC<Props> = ({
  valuePaise,
  fontSize,
  lineHeight,
  color,
  fontFamily = 'Satoshi-Black',
  letterSpacing = 0,
  prefix = '₹',
  replayToken = 0,
  style,
}) => {
  const formatted = useMemo(
    () => Money.format(Math.round(valuePaise), { hideSymbol: true, zeroDecimals: true }),
    [valuePaise],
  );
  const text: TextStyle = {
    fontSize,
    lineHeight,
    color,
    fontFamily,
    letterSpacing,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  };

  let digitIndex = 0;
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${prefix}${formatted}`}
      style={[styles.row, style]}
    >
      <Text style={text} importantForAccessibility="no-hide-descendants">
        {prefix}
      </Text>
      {formatted.split('').map((ch, i) => {
        if (!/\d/.test(ch)) {
          return (
            <Text key={`c${i}`} style={text} importantForAccessibility="no-hide-descendants">
              {ch}
            </Text>
          );
        }
        const order = digitIndex++;
        return (
          <Digit
            key={`d${formatted.length - i}`}
            digit={Number(ch)}
            order={order}
            text={text}
            lineHeight={lineHeight}
            replayToken={replayToken}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
});
