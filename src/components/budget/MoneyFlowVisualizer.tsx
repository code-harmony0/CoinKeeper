import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Text } from '../ui/Text';

interface Props {
  needs: number;
  wants: number;
  savings: number;
  colors: any;
}

export const MoneyFlowVisualizer: React.FC<Props> = ({ needs, wants, savings, colors }) => {
  const needsWidth = useAnimatedStyle(() => ({ width: withSpring(`${Math.max(0, needs)}%`, { damping: 20 }) }));
  const wantsWidth = useAnimatedStyle(() => ({ width: withSpring(`${Math.max(0, wants)}%`, { damping: 20 }) }));
  const savingsWidth = useAnimatedStyle(() => ({ width: withSpring(`${Math.max(0, savings)}%`, { damping: 20 }) }));

  return (
    <View style={styles.container}>
      <Text variant="caption" style={[styles.label, { color: colors.textSecondary }]}>Money Flow</Text>
      
      <View style={[styles.barContainer, { backgroundColor: colors.inputBg }]}>
        <Animated.View style={[styles.segmentContainer, needsWidth]}>
          {needs > 0 && <View style={[styles.pill, { backgroundColor: colors.mintDeep }]} />}
        </Animated.View>
        <Animated.View style={[styles.segmentContainer, wantsWidth]}>
          {wants > 0 && <View style={[styles.pill, { backgroundColor: colors.peachDeep }]} />}
        </Animated.View>
        <Animated.View style={[styles.segmentContainer, savingsWidth]}>
          {savings > 0 && <View style={[styles.pill, { backgroundColor: colors.primaryAccent }]} />}
        </Animated.View>
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.mintDeep }]} />
          <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Bold' }}>Needs</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.peachDeep }]} />
          <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Bold' }}>Wants</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.primaryAccent }]} />
          <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Bold' }}>Savings</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 40, // Increased breathing room
    paddingHorizontal: 24,
  },
  label: {
    fontFamily: 'Satoshi-Medium',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 16,
    fontSize: 11,
  },
  barContainer: {
    height: 12, // slightly thicker
    flexDirection: 'row',
    borderRadius: 6,
    padding: 2, // inner padding for pills
  },
  segmentContainer: {
    height: '100%',
    paddingHorizontal: 1, // small gap between pills
  },
  pill: {
    flex: 1,
    borderRadius: 4, // fully rounded pills inside the track
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
});
