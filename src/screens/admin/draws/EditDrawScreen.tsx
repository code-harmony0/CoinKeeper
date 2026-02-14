import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Calendar, DollarSign, Save, ChevronDown, X, Edit } from 'lucide-react-native';
import type { DrawStatus } from '../../../types/draw';
import firestore from '@react-native-firebase/firestore';

const STATUS_OPTIONS: DrawStatus[] = ['upcoming', 'in_progress', 'completed', 'cancelled'];

const STATUS_LABELS: Record<DrawStatus, string> = {
  upcoming: 'Upcoming',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Mock draw data (pre-filled)
const DUMMY_DRAW = {
  id: '1',
  groupName: 'Monthly Savings Group',
  drawNumber: '12',
  prizeAmount: '50000',
  scheduledDate: '20/12/2025',
  biddingDeadline: '18/12/2025',
  status: 'in_progress' as DrawStatus,
};

const SPRING_CONFIG = {
  damping: 16,
  stiffness: 140,
  mass: 1,
};

interface Props {
  navigation: any;
  route: any;
}

export const EditDrawScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();

  // Initialize with dummy data (in real app, this would come from route.params or Firestore)
  const [groupName] = useState(DUMMY_DRAW.groupName); // Read-only
  const [drawNumber] = useState(DUMMY_DRAW.drawNumber); // Read-only
  const [prizeAmount, setPrizeAmount] = useState(DUMMY_DRAW.prizeAmount);
  const [scheduledDate, setScheduledDate] = useState(DUMMY_DRAW.scheduledDate);
  const [biddingDeadline, setBiddingDeadline] = useState(DUMMY_DRAW.biddingDeadline);
  const [status, setStatus] = useState<DrawStatus>(DUMMY_DRAW.status);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const handleSave = () => {
    ReactNativeHapticFeedback.trigger('impactHeavy');

    // Validation
    if (!prizeAmount) {
      Alert.alert('Error', 'Please enter prize amount');
      return;
    }
    if (!scheduledDate) {
      Alert.alert('Error', 'Please enter scheduled date');
      return;
    }
    if (!biddingDeadline) {
      Alert.alert('Error', 'Please enter bidding deadline');
      return;
    }

    // TODO: Update draw in Firestore
    console.log('Updating draw:', {
      prizeAmount: parseFloat(prizeAmount),
      scheduledDate,
      biddingDeadline,
      status,
    });

    Alert.alert('Success', 'Draw updated successfully!', [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  const handleCancel = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    Alert.alert('Cancel', 'Are you sure you want to discard changes?', [
      {
        text: 'No',
        style: 'cancel',
      },
      {
        text: 'Yes',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  const getStatusColor = () => {
    switch (status) {
      case 'upcoming':
        return '#2196F3';
      case 'in_progress':
        return '#f0ad4e';
      case 'completed':
        return '#5cb85c';
      case 'cancelled':
        return '#999';
      default:
        return '#999';
    }
  };

  const StatusPickerModal = () => (
    <Modal
      visible={showStatusPicker}
      transparent
      animationType="fade"
      onRequestClose={() => setShowStatusPicker(false)}>
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeInDown.springify(SPRING_CONFIG)}
          style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Status</Text>
            <TouchableOpacity
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight');
                setShowStatusPicker(false);
              }}>
              <X size={24} color="#121723" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {STATUS_OPTIONS.map((statusOption, index) => (
              <Animated.View
                key={statusOption}
                entering={FadeInDown.delay(index * 50).springify(SPRING_CONFIG)}>
                <TouchableOpacity
                  onPress={() => {
                    ReactNativeHapticFeedback.trigger('selection');
                    setStatus(statusOption);
                    setShowStatusPicker(false);
                  }}
                  style={[
                    styles.modalItem,
                    status === statusOption && styles.modalItemSelected,
                  ]}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: status === statusOption ? '#FFFFFF' : getStatusColorForOption(statusOption) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.modalItemText,
                      status === statusOption && styles.modalItemTextSelected,
                    ]}>
                    {STATUS_LABELS[statusOption]}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );

  const getStatusColorForOption = (statusOption: DrawStatus) => {
    switch (statusOption) {
      case 'upcoming':
        return '#2196F3';
      case 'in_progress':
        return '#f0ad4e';
      case 'completed':
        return '#5cb85c';
      case 'cancelled':
        return '#999';
      default:
        return '#999';
    }
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
          <Text style={styles.headerTitle}>Edit Draw</Text>
          <Text style={styles.headerSubtitle}>Modify draw details below</Text>
        </Animated.View>

        {/* Group Name (Read-only) */}
        <Animated.View
          entering={FadeInDown.delay(50).springify(SPRING_CONFIG)}
          style={styles.inputCard}>
          <Text style={styles.label}>Group Name</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{groupName}</Text>
            <Text style={styles.readOnlyLabel}>Read-only</Text>
          </View>
        </Animated.View>

        {/* Draw Number (Read-only) */}
        <Animated.View
          entering={FadeInDown.delay(100).springify(SPRING_CONFIG)}
          style={styles.inputCard}>
          <Text style={styles.label}>Draw Number</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>#{drawNumber}</Text>
            <Text style={styles.readOnlyLabel}>Read-only</Text>
          </View>
        </Animated.View>

        {/* Status Selection */}
        <Animated.View
          entering={FadeInDown.delay(150).springify(SPRING_CONFIG)}
          style={styles.inputCard}>
          <Text style={styles.label}>Status</Text>
          <TouchableOpacity
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight');
              setShowStatusPicker(true);
            }}
            style={styles.pickerButton}>
            <View style={styles.pickerContent}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={styles.pickerText}>
                {STATUS_LABELS[status]}
              </Text>
            </View>
            <ChevronDown size={20} color="#666" />
          </TouchableOpacity>
        </Animated.View>

        {/* Prize Amount */}
        <Animated.View
          entering={FadeInDown.delay(200).springify(SPRING_CONFIG)}
          style={styles.inputCard}>
          <Text style={styles.label}>Prize Amount</Text>
          <View style={styles.inputContainer}>
            <DollarSign size={20} color="#666" />
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              placeholder="Enter prize amount"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={prizeAmount}
              onChangeText={setPrizeAmount}
              style={styles.input}
            />
          </View>
        </Animated.View>

        {/* Scheduled Date */}
        <Animated.View
          entering={FadeInDown.delay(250).springify(SPRING_CONFIG)}
          style={styles.inputCard}>
          <Text style={styles.label}>Scheduled Date</Text>
          <View style={styles.inputContainer}>
            <Calendar size={20} color="#666" />
            <TextInput
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#999"
              value={scheduledDate}
              onChangeText={setScheduledDate}
              style={styles.input}
            />
          </View>
          <Text style={styles.helperText}>Format: DD/MM/YYYY (e.g., 20/12/2025)</Text>
        </Animated.View>

        {/* Bidding Deadline */}
        <Animated.View
          entering={FadeInDown.delay(300).springify(SPRING_CONFIG)}
          style={styles.inputCard}>
          <Text style={styles.label}>Bidding Deadline</Text>
          <View style={styles.inputContainer}>
            <Calendar size={20} color="#666" />
            <TextInput
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#999"
              value={biddingDeadline}
              onChangeText={setBiddingDeadline}
              style={styles.input}
            />
          </View>
          <Text style={styles.helperText}>Format: DD/MM/YYYY (e.g., 18/12/2025)</Text>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          entering={FadeInDown.delay(350).springify(SPRING_CONFIG)}
          style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}>
            <Save size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <StatusPickerModal />
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
  readOnlyField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  readOnlyText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#666',
  },
  readOnlyLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#999',
    fontStyle: 'italic',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pickerText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#121723',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  helperText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#999',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#121723',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121723',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxHeight: '50%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
  },
  modalList: {
    maxHeight: 300,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalItemSelected: {
    backgroundColor: '#121723',
  },
  modalItemText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#121723',
  },
  modalItemTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
});

export default EditDrawScreen;
