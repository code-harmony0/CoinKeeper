import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { DollarSign, CreditCard, Minus, AlertCircle } from 'lucide-react-native';

const SPRING_CONFIG = {
  damping: 16,
  stiffness: 140,
  mass: 1,
};

const CURRENT_BALANCE = 125000;
const QUICK_AMOUNTS = [10000, 25000, 50000, 100000];

interface Props {
  navigation: any;
}

export const WithdrawFundsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [description, setDescription] = useState('');

  const handleQuickAmount = (quickAmount: number) => {
    ReactNativeHapticFeedback.trigger('selection');
    if (quickAmount > CURRENT_BALANCE) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }
    setAmount(quickAmount.toString());
  };

  const handleWithdraw = () => {
    ReactNativeHapticFeedback.trigger('impactHeavy');

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > CURRENT_BALANCE) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    if (!bankAccount) {
      Alert.alert('Error', 'Please enter bank account number');
      return;
    }

    if (!ifsc) {
      Alert.alert('Error', 'Please enter IFSC code');
      return;
    }

    // TODO: Withdraw funds from wallet via Firestore
    console.log('Withdrawing funds:', {
      amount: parseFloat(amount),
      bankAccount,
      ifsc,
      description,
    });

    Alert.alert('Success', `₹${parseFloat(amount).toLocaleString('en-IN')} withdrawal initiated!`, [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top }]}
      edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(0).springify(SPRING_CONFIG)}
          style={styles.header}>
          <Text style={styles.headerTitle}>Withdraw Funds</Text>
          <Text style={styles.headerSubtitle}>Transfer money to your bank account</Text>
        </Animated.View>

        {/* Balance Info */}
        <Animated.View
          entering={FadeInDown.delay(50).springify(SPRING_CONFIG)}
          style={styles.balanceCard}>
          <AlertCircle size={20} color="#2196F3" />
          <Text style={styles.balanceText}>
            Available Balance: <Text style={styles.balanceAmount}>₹{CURRENT_BALANCE.toLocaleString('en-IN')}</Text>
          </Text>
        </Animated.View>

        {/* Amount Input */}
        <Animated.View
          entering={FadeInDown.delay(100).springify(SPRING_CONFIG)}
          style={styles.inputCard}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.inputContainer}>
            <DollarSign size={20} color="#666" />
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              placeholder="Enter amount"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              style={styles.input}
            />
          </View>
        </Animated.View>

        {/* Quick Amount Buttons */}
        <Animated.View
          entering={FadeInDown.delay(150).springify(SPRING_CONFIG)}
          style={styles.quickAmountsSection}>
          <Text style={styles.sectionTitle}>Quick Withdraw</Text>
          <View style={styles.quickAmountsGrid}>
            {QUICK_AMOUNTS.map((quickAmount, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleQuickAmount(quickAmount)}
                disabled={quickAmount > CURRENT_BALANCE}
                style={[
                  styles.quickAmountButton,
                  amount === quickAmount.toString() && styles.quickAmountButtonActive,
                  quickAmount > CURRENT_BALANCE && styles.quickAmountButtonDisabled,
                ]}>
                <Text
                  style={[
                    styles.quickAmountText,
                    amount === quickAmount.toString() && styles.quickAmountTextActive,
                    quickAmount > CURRENT_BALANCE && styles.quickAmountTextDisabled,
                  ]}>
                  ₹{quickAmount.toLocaleString('en-IN')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Bank Details */}
        <Animated.View
          entering={FadeInDown.delay(200).springify(SPRING_CONFIG)}
          style={styles.inputCard}>
          <Text style={styles.label}>Bank Account Number</Text>
          <View style={styles.inputContainer}>
            <CreditCard size={20} color="#666" />
            <TextInput
              placeholder="Enter account number"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={bankAccount}
              onChangeText={setBankAccount}
              style={styles.input}
            />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(250).springify(SPRING_CONFIG)}
          style={styles.inputCard}>
          <Text style={styles.label}>IFSC Code</Text>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Enter IFSC code"
              placeholderTextColor="#999"
              autoCapitalize="characters"
              value={ifsc}
              onChangeText={setIfsc}
              style={[styles.input, { paddingLeft: 16 }]}
            />
          </View>
        </Animated.View>

        {/* Description */}
        <Animated.View
          entering={FadeInDown.delay(300).springify(SPRING_CONFIG)}
          style={styles.inputCard}>
          <Text style={styles.label}>Description (Optional)</Text>
          <View style={styles.textAreaContainer}>
            <TextInput
              placeholder="Add a note..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
              style={styles.textArea}
            />
          </View>
        </Animated.View>

        {/* Withdraw Button */}
        <Animated.View
          entering={FadeInDown.delay(350).springify(SPRING_CONFIG)}
          style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={handleWithdraw}
            style={styles.withdrawButton}>
            <Minus size={20} color="#FFFFFF" />
            <Text style={styles.withdrawButtonText}>Withdraw Funds</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C2DFF7',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#666',
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    gap: 12,
  },
  balanceText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#1976D2',
  },
  balanceAmount: {
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1565C0',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#121723',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 8,
  },
  currencySymbol: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#121723',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#121723',
    paddingVertical: 10,
  },
  quickAmountsSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
    marginBottom: 12,
  },
  quickAmountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAmountButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
  },
  quickAmountButtonActive: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  quickAmountButtonDisabled: {
    opacity: 0.5,
  },
  quickAmountText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#666',
  },
  quickAmountTextActive: {
    color: '#2196F3',
  },
  quickAmountTextDisabled: {
    color: '#999',
  },
  textAreaContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
  },
  textArea: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#121723',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  withdrawButtonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
  },
});

export default WithdrawFundsScreen;
