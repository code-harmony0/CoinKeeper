import React from 'react';
import { View, StyleSheet, Pressable, PermissionsAndroid, Platform, Alert } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { BodyText, Caption } from '../core/Typography';
import { COLORS, SPACING, RADIUS } from '../../theme';
import { MessageSquare, Sparkles } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import SmsAndroid from 'react-native-get-sms-android';

interface SMSAutoFillProps {
  onTransactionDetected: (data: {
    amount: number;
    type: 'expense' | 'income';
    description?: string;
    category?: string;
  }) => void;
}

export const SMSAutoFill: React.FC<SMSAutoFillProps> = ({ onTransactionDetected }) => {
  const scale = useSharedValue(1);
  const sparkleRotate = useSharedValue(0);
  const [isScanning, setIsScanning] = React.useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 12 }) }],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparkleRotate.value}deg` }],
  }));

  const requestSMSPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available', 'SMS scanning is only available on Android devices.');
      return false;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission',
          message: 'CoinKeeper needs access to your SMS to automatically detect transactions',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error('SMS permission error:', err);
      return false;
    }
  };

  const parseTransactionFromSMS = (message: string): {
    amount: number;
    type: 'expense' | 'income';
    description?: string;
    category?: string;
  } | null => {
    // Common patterns for transaction SMS
    const patterns = {
      // Debited/Spent patterns
      debit: /(?:debited|spent|paid|withdrawn).*?(?:rs\.?|inr|₹)\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
      // Credited/Received patterns
      credit: /(?:credited|received|deposited).*?(?:rs\.?|inr|₹)\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
      // Generic amount pattern
      amount: /(?:rs\.?|inr|₹)\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
    };

    let amount: number | null = null;
    let type: 'expense' | 'income' = 'expense';

    // Check for debit
    const debitMatch = message.match(patterns.debit);
    if (debitMatch) {
      amount = parseFloat(debitMatch[1].replace(/,/g, ''));
      type = 'expense';
    }

    // Check for credit
    const creditMatch = message.match(patterns.credit);
    if (creditMatch) {
      amount = parseFloat(creditMatch[1].replace(/,/g, ''));
      type = 'income';
    }

    // Fallback to generic amount
    if (!amount) {
      const amountMatch = message.match(patterns.amount);
      if (amountMatch) {
        amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      }
    }

    if (!amount) return null;

    // Try to extract merchant/description
    let description = '';
    const merchantPatterns = [
      /(?:at|to|from)\s+([A-Z][A-Za-z0-9\s&-]+?)(?:\s+on|\s+via|\.|$)/,
      /(?:merchant|vendor):\s*([A-Za-z0-9\s&-]+)/i,
    ];

    for (const pattern of merchantPatterns) {
      const match = message.match(pattern);
      if (match) {
        description = match[1].trim();
        break;
      }
    }

    // Auto-categorize based on keywords
    let category = '';
    const categoryKeywords = {
      food: ['swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'dominos', 'pizza'],
      transport: ['uber', 'ola', 'rapido', 'petrol', 'fuel', 'metro', 'bus'],
      shopping: ['amazon', 'flipkart', 'myntra', 'mall', 'shopping'],
      entertainment: ['netflix', 'spotify', 'prime', 'hotstar', 'movie', 'cinema'],
      bills: ['electricity', 'water', 'gas', 'broadband', 'mobile', 'recharge'],
    };

    const lowerMessage = message.toLowerCase();
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        category = cat;
        break;
      }
    }

    return {
      amount,
      type,
      description: description || undefined,
      category: category || undefined,
    };
  };

  const scanRecentSMS = async () => {
    const hasPermission = await requestSMSPermission();
    if (!hasPermission) {
      return;
    }

    setIsScanning(true);
    ReactNativeHapticFeedback.trigger('impactLight');

    // Animate sparkle
    sparkleRotate.value = withSequence(
      withSpring(360, { damping: 10 }),
      withSpring(0, { damping: 10 })
    );

    try {
      const filter = {
        box: 'inbox',
        maxCount: 20, // Scan last 20 messages
        indexFrom: 0,
      };

      SmsAndroid.list(
        JSON.stringify(filter),
        (fail: string) => {
          console.error('Failed to read SMS:', fail);
          setIsScanning(false);
          Alert.alert('Error', 'Failed to read SMS messages');
        },
        (count: number, smsList: string) => {
          const messages = JSON.parse(smsList);

          // Filter for recent messages (last 7 days)
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const recentMessages = messages.filter(
            (msg: any) => msg.date > sevenDaysAgo
          );

          // Try to find transaction messages
          let foundTransaction = false;
          for (const msg of recentMessages) {
            const transaction = parseTransactionFromSMS(msg.body);
            if (transaction) {
              ReactNativeHapticFeedback.trigger('notificationSuccess');
              onTransactionDetected(transaction);
              foundTransaction = true;
              break;
            }
          }

          if (!foundTransaction) {
            Alert.alert(
              'No Transactions Found',
              'Could not find any recent transaction SMS from your bank.'
            );
          }

          setIsScanning(false);
        }
      );
    } catch (error) {
      console.error('SMS scan error:', error);
      setIsScanning(false);
      Alert.alert('Error', 'Failed to scan SMS messages');
    }
  };

  const handlePress = () => {
    scale.value = 0.95;
    setTimeout(() => (scale.value = 1), 100);
    scanRecentSMS();
  };

  return (
    <Pressable onPress={handlePress} disabled={isScanning}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={styles.iconContainer}>
          <MessageSquare size={20} color={COLORS.lavender} strokeWidth={2} />
          <Animated.View style={[styles.sparkle, sparkleStyle]}>
            <Sparkles size={14} color={COLORS.warningYellow} strokeWidth={2} fill={COLORS.warningYellow} />
          </Animated.View>
        </View>
        <View style={styles.content}>
          <BodyText medium color={COLORS.navyText}>
            {isScanning ? 'Scanning SMS...' : 'Auto-fill from SMS'}
          </BodyText>
          <Caption color={COLORS.grayText}>
            Detect transaction from bank SMS
          </Caption>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(230, 223, 253, 0.3)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.lavender,
    gap: SPACING.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(230, 223, 253, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sparkle: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  content: {
    flex: 1,
  },
});
