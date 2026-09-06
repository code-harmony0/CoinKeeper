import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  Easing,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Money } from '../../utils/money';
import {
  INFORMATIONAL,
  informationalDuration,
  sequenceDelay,
  useReducedMotion,
} from '../../theme/motion';

export interface CountUpProps {
  value: number;
  duration?: number;
  /** Wait this long before counting — used to place the count in a sequence. */
  delay?: number;
  /**
   * Rendered immediately and never animated. The currency symbol belongs here:
   * a ₹ that fades in with its digits reads as the whole string loading,
   * rather than as a number climbing.
   */
  prefix?: string;
  style?: StyleProp<TextStyle>;
  formatter?: (value: number) => string;
  isPaise?: boolean;
  testID?: string;
}

const FRAME_INTERVAL_MS = 1000 / 30;

export const CountUp: React.FC<CountUpProps> = ({
  value,
  duration = 800,
  delay = 0,
  prefix = '',
  style,
  isPaise = false,
  formatter,
  testID,
}) => {
  const defaultFormatter = (v: number) => 
    isPaise ? Money.format(Math.round(v), { hideSymbol: true, zeroDecimals: true }) : Math.round(v).toLocaleString('en-IN');
    
  const activeFormatter = formatter || defaultFormatter;
  const reduced = useReducedMotion();
  // Starts at zero so the first render actually counts up. Previously both the
  // shared value and the display were seeded with `value`, so a component
  // named CountUp never animated on mount — only on subsequent changes.
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = useState(0);
  const lastUpdateRef = useRef(0);

  const updateDisplay = (next: number, force: boolean) => {
    const now = Date.now();
    if (!force && now - lastUpdateRef.current < FRAME_INTERVAL_MS) {
      return;
    }
    lastUpdateRef.current = now;
    setDisplayValue(next);
  };

  useEffect(() => {
    // A counting figure IS the number — the movement is how the quantity is
    // communicated, so it plays regardless of the system motion flag and
    // shortens instead. See src/theme/motion.ts for why that distinction
    // exists.
    const span = informationalDuration(duration, reduced);
    const wait = sequenceDelay(delay, reduced);

    animatedValue.value = withDelay(
      wait,
      withTiming(value, {
        duration: span,
        easing: Easing.out(Easing.cubic),
        reduceMotion: INFORMATIONAL,
      }),
    );

    // Guaranteed settle. Now that the display starts at zero, anything that
    // stops the animation from ticking — a backgrounded app, a test renderer
    // with no frame loop — would otherwise leave a money figure reading ₹0,
    // which is worse than not animating at all.
    const settle = setTimeout(() => updateDisplay(value, true), wait + span);
    return () => clearTimeout(settle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, delay, reduced]);

  useAnimatedReaction(
    () => animatedValue.value,
    (current, previous) => {
      if (previous === null || current !== previous) {
        const isFinal = current === value;
        runOnJS(updateDisplay)(current, isFinal);
      }
    },
    [value],
  );

  return (
    <Text style={style} testID={testID}>
      {prefix}
      {activeFormatter(displayValue)}
    </Text>
  );
};

export default CountUp;
