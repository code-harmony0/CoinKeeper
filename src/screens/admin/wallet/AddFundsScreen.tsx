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
import { DollarSign, CreditCard, Plus } from 'lucide-react-native';

const SPRING_CONFIG = {
  damping: 16,
  stiffness: 140,
  mass: 1,
};

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000];

interface Props {
  navigation: any;
}

export const AddFundsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleQuickAmount = (quickAmount: number) => {
    ReactNativeHapticFeedback.trigger('selection');
    setAmount(quickAmount.toString());
  };

  const handleAddFunds = () => {
    ReactNativeHapticFeedback.trigger('impactHeavy');

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // TODO: Add funds to wallet via Firestore
    console.log('Adding funds:', {
      amount: parseFloat(amount),
      description,
    });

    Alert.alert('Success', `₹${parseFloat(amount).toLocaleString('en-IN')} added successfully!`, [
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
          <Text style={styles.headerTitle}>Add Funds</Text>
          <Text style={styles.headerSubtitle}>Enter amount to add to your wallet</Text>
        </Animated.View>

        {/* Amount Input */}
        <Animated.View
          entering={FadeInDown.delay(50).springify(SPRING_CONFIG)}
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
          entering={FadeInDown.delay(100).springify(SPRING_CONFIG)}
          style={styles.quickAmountsSection}>
          <Text style={styles.sectionTitle}>Quick Add</Text>
          <View style={styles.quickAmountsGrid}>
            {QUICK_AMOUNTS.map((quickAmount, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleQuickAmount(quickAmount)}
                style={[
                  styles.quickAmountButton,
                  amount === quickAmount.toString() && styles.quickAmountButtonActive,
                ]}>
                <Text
                  style={[
                    styles.quickAmountText,
                    amount === quickAmount.toString() && styles.quickAmountTextActive,
                  ]}>
                  ₹{quickAmount.toLocaleString('en-IN')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Description */}
        <Animated.View
          entering={FadeInDown.delay(150).springify(SPRING_CONFIG)}
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

        {/* Add Button */}
        <Animated.View
          entering={FadeInDown.delay(200).springify(SPRING_CONFIG)}
          style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={handleAddFunds}
            style={styles.addButton}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Funds</Text>
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
    borderColor: '#5cb85c',
    backgroundColor: '#E8F5E9',
  },
  quickAmountText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#666',
  },
  quickAmountTextActive: {
    color: '#5cb85c',
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5cb85c',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
  },
});

export default AddFundsScreen;
