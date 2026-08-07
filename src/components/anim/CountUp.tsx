import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Money } from '../../utils/money';

export interface CountUpProps {
  value: number;
  duration?: number;
  prefix?: string;
  style?: StyleProp<TextStyle>;
  formatter?: (value: number) => string;
  isPaise?: boolean;
}

const FRAME_INTERVAL_MS = 1000 / 30;

const defaultFormatter = (value: number) => Math.round(value).toLocaleString('en-IN');

export const CountUp: React.FC<CountUpProps> = ({
  value,
  duration = 800,
  prefix = '',
  style,
  isPaise = false,
  formatter,
}) => {
  const defaultFormatter = (v: number) => 
    isPaise ? Money.format(Math.round(v), { hideSymbol: true, zeroDecimals: true }) : Math.round(v).toLocaleString('en-IN');
    
  const activeFormatter = formatter || defaultFormatter;
  const animatedValue = useSharedValue(value);
  const [displayValue, setDisplayValue] = useState(value);
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
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

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
    <Text style={style}>
      {prefix}
      {activeFormatter(displayValue)}
    </Text>
  );
};

export default CountUp;
