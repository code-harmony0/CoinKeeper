import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Caption } from '../core/Typography';
import { COLORS, SPACING, RADIUS } from '../../theme';
import { CreditCard, Smartphone, Wallet, Landmark, Banknote } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank' | 'wallet';

export interface PaymentMethodOption {
  id: PaymentMethod;
  label: string;
  icon: React.ReactNode;
  color: string;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'cash',
    label: 'Cash',
    icon: <Banknote size={20} color={COLORS.navyText} strokeWidth={2} />,
    color: COLORS.mintGreen,
  },
  {
    id: 'card',
    label: 'Card',
    icon: <CreditCard size={20} color={COLORS.navyText} strokeWidth={2} />,
    color: COLORS.babyBlue,
  },
  {
    id: 'upi',
    label: 'UPI',
    icon: <Smartphone size={20} color={COLORS.navyText} strokeWidth={2} />,
    color: COLORS.lavender,
  },
  {
    id: 'bank',
    label: 'Bank',
    icon: <Landmark size={20} color={COLORS.navyText} strokeWidth={2} />,
    color: COLORS.softPeach,
  },
  {
    id: 'wallet',
    label: 'Wallet',
    icon: <Wallet size={20} color={COLORS.navyText} strokeWidth={2} />,
    color: COLORS.warningYellow,
  },
];

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onSelectMethod,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {PAYMENT_METHODS.map((method) => (
        <PaymentMethodButton
          key={method.id}
          method={method}
          isSelected={selectedMethod === method.id}
          onPress={() => {
            ReactNativeHapticFeedback.trigger('impactLight');
            onSelectMethod(method.id);
          }}
        />
      ))}
    </ScrollView>
  );
};

const PaymentMethodButton: React.FC<{
  method: PaymentMethodOption;
  isSelected: boolean;
  onPress: () => void;
}> = ({ method, isSelected, onPress }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 12 }) }],
  }));

  const handlePress = () => {
    scale.value = 0.95;
    setTimeout(() => (scale.value = 1), 100);
    onPress();
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          styles.button,
          { backgroundColor: method.color },
          isSelected && styles.buttonSelected,
          animatedStyle,
        ]}
      >
        <View style={styles.iconContainer}>{method.icon}</View>
        <Caption
          style={[styles.label, isSelected ? styles.labelSelected : undefined]}
          numberOfLines={1}
        >
          {method.label}
        </Caption>
        {isSelected && <View style={styles.selectedIndicator} />}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  button: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    minWidth: 90,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  buttonSelected: {
    borderColor: COLORS.navyText,
    transform: [{ scale: 1.05 }],
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    color: COLORS.navyText,
  },
  labelSelected: {
    fontWeight: '600',
  },
  selectedIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.navyText,
    marginLeft: SPACING.xs,
  },
});
