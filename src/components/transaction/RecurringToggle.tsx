import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { BodyText, Caption } from '../core/Typography';
import { COLORS, SPACING, RADIUS } from '../../theme';
import { Repeat, ChevronRight } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | null;

export interface RecurringOption {
  id: RecurringFrequency;
  label: string;
  description: string;
}

export const RECURRING_OPTIONS: RecurringOption[] = [
  { id: null, label: 'One-time', description: 'Single transaction' },
  { id: 'daily', label: 'Daily', description: 'Repeats every day' },
  { id: 'weekly', label: 'Weekly', description: 'Repeats every week' },
  { id: 'monthly', label: 'Monthly', description: 'Repeats every month' },
  { id: 'yearly', label: 'Yearly', description: 'Repeats every year' },
];

interface RecurringToggleProps {
  isRecurring: boolean;
  frequency: RecurringFrequency;
  onToggle: () => void;
  onSelectFrequency: () => void;
}

export const RecurringToggle: React.FC<RecurringToggleProps> = ({
  isRecurring,
  frequency,
  onToggle,
  onSelectFrequency,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 12 }) }],
  }));

  const handleToggle = () => {
    scale.value = 0.98;
    setTimeout(() => (scale.value = 1), 100);
    ReactNativeHapticFeedback.trigger('impactLight');
    onToggle();
  };

  const currentOption = RECURRING_OPTIONS.find(opt => opt.id === frequency) || RECURRING_OPTIONS[0];

  return (
    <View style={styles.container}>
      {/* Main Toggle */}
      <Pressable onPress={handleToggle}>
        <Animated.View style={[styles.toggleCard, animatedStyle]}>
          <View style={styles.toggleLeft}>
            <View style={[styles.iconContainer, isRecurring && styles.iconContainerActive]}>
              <Repeat
                size={20}
                color={isRecurring ? COLORS.babyBlue : COLORS.grayText}
                strokeWidth={2}
              />
            </View>
            <View>
              <BodyText medium>Recurring Transaction</BodyText>
              <Caption color={COLORS.grayText}>
                {isRecurring ? currentOption.description : 'One-time transaction'}
              </Caption>
            </View>
          </View>
          <View style={[styles.switch, isRecurring && styles.switchActive]}>
            <View style={[styles.switchThumb, isRecurring && styles.switchThumbActive]} />
          </View>
        </Animated.View>
      </Pressable>

      {/* Frequency Selector */}
      {isRecurring && (
        <Pressable onPress={onSelectFrequency}>
          <Animated.View style={[styles.frequencyCard, animatedStyle]}>
            <BodyText medium color={COLORS.babyBlue}>
              {currentOption.label}
            </BodyText>
            <ChevronRight size={20} color={COLORS.babyBlue} strokeWidth={2} />
          </Animated.View>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(189, 224, 254, 0.3)',
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.borderGray,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: COLORS.babyBlue,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  frequencyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(189, 224, 254, 0.2)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.babyBlue,
  },
});
