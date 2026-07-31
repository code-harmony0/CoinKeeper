import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Caption } from '../core/Typography';
import { useSpecTheme } from '../../theme/specTheme';
import { CreditCard, Smartphone, Wallet, Landmark, Banknote } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank' | 'wallet';

export interface PaymentMethodOption {
  id: PaymentMethod;
  label: string;
  icon: (color: string) => React.ReactNode;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'cash', label: 'Cash', icon: color => <Banknote size={20} color={color} strokeWidth={2} /> },
  { id: 'card', label: 'Card', icon: color => <CreditCard size={20} color={color} strokeWidth={2} /> },
  { id: 'upi', label: 'UPI', icon: color => <Smartphone size={20} color={color} strokeWidth={2} /> },
  { id: 'bank', label: 'Bank', icon: color => <Landmark size={20} color={color} strokeWidth={2} /> },
  { id: 'wallet', label: 'Wallet', icon: color => <Wallet size={20} color={color} strokeWidth={2} /> },
];

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onSelectMethod,
}) => {
  const { colors } = useSpecTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {PAYMENT_METHODS.map(method => (
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
  const { colors } = useSpecTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 12 }) }],
  }));

  const handlePress = () => {
    scale.value = 0.95;
    setTimeout(() => (scale.value = 1), 100);
    onPress();
  };

  const iconColor = isSelected ? '#FFFFFF' : colors.textPrimary;

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          styles.button,
          { backgroundColor: isSelected ? colors.primaryAccent : colors.chipBg },
          animatedStyle,
        ]}
      >
        <View style={styles.iconContainer}>{method.icon(iconColor)}</View>
        <Caption
          style={[styles.label, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}
          numberOfLines={1}
        >
          {method.label}
        </Caption>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 90,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
  },
});
