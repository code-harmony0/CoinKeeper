import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Calendar, DollarSign, Users, Plus, ChevronDown, X } from 'lucide-react-native';
import firestore from '@react-native-firebase/firestore';

// Mock groups for dropdown
const DUMMY_GROUPS = [
  { id: 'group1', name: 'Monthly Savings Group' },
  { id: 'group2', name: 'Family Chit Fund' },
  { id: 'group3', name: 'Office Colleagues Fund' },
  { id: 'group4', name: 'Community Development Fund' },
  { id: 'group5', name: 'Women Empowerment Group' },
];

// SPRING_CONFIG removed for chained methods

interface Props {
  navigation: any;
}

export const CreateDrawScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null);
  const [drawNumber, setDrawNumber] = useState('12'); // Auto-generated, shown as read-only
  const [prizeAmount, setPrizeAmount] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [biddingDeadline, setBiddingDeadline] = useState('');
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const handleCreate = () => {
    ReactNativeHapticFeedback.trigger('impactHeavy');

    // Validation
    if (!selectedGroup) {
      Alert.alert('Error', 'Please select a group');
      return;
    }
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

    // TODO: Create draw in Firestore
    console.log('Creating draw:', {
      groupId: selectedGroup.id,
      groupName: selectedGroup.name,
      drawNumber,
      prizeAmount: parseFloat(prizeAmount),
      scheduledDate,
      biddingDeadline,
    });

    Alert.alert('Success', 'Draw created successfully!', [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  const GroupPickerModal = () => (
    <Modal
      visible={showGroupPicker}
      transparent
      animationType="fade"
      onRequestClose={() => setShowGroupPicker(false)}>
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeInDown.springify().damping(16).stiffness(140).mass(1)}
          style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Group</Text>
            <TouchableOpacity
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight');
                setShowGroupPicker(false);
              }}>
              <X size={24} color="#121723" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {DUMMY_GROUPS.map((group, index) => (
              <Animated.View
                key={group.id}
                entering={FadeInDown.delay(index * 50).springify().damping(16).stiffness(140).mass(1)}>
                <TouchableOpacity
                  onPress={() => {
                    ReactNativeHapticFeedback.trigger('selection');
                    setSelectedGroup(group);
                    setShowGroupPicker(false);
                  }}
                  style={[
                    styles.modalItem,
                    selectedGroup?.id === group.id && styles.modalItemSelected,
                  ]}>
                  <Users size={20} color={selectedGroup?.id === group.id ? '#FFFFFF' : '#121723'} />
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedGroup?.id === group.id && styles.modalItemTextSelected,
                    ]}>
                    {group.name}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top }]}
      edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(0).springify().damping(16).stiffness(140).mass(1)}
          style={styles.header}>
          <Text style={styles.headerTitle}>Create New Draw</Text>
          <Text style={styles.headerSubtitle}>Fill in the details below</Text>
        </Animated.View>

        {/* Group Selection */}
        <Animated.View
          entering={FadeInDown.delay(50).springify().damping(16).stiffness(140).mass(1)}
          style={styles.inputCard}>
          <Text style={styles.label}>Select Group</Text>
          <TouchableOpacity
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight');
              setShowGroupPicker(true);
            }}
            style={styles.pickerButton}>
            <View style={styles.pickerContent}>
              <Users size={20} color="#666" />
              <Text style={[styles.pickerText, !selectedGroup && styles.placeholderText]}>
                {selectedGroup ? selectedGroup.name : 'Select a group...'}
              </Text>
            </View>
            <ChevronDown size={20} color="#666" />
          </TouchableOpacity>
        </Animated.View>

        {/* Draw Number (Auto-generated, read-only) */}
        <Animated.View
          entering={FadeInDown.delay(100).springify().damping(16).stiffness(140).mass(1)}
          style={styles.inputCard}>
          <Text style={styles.label}>Draw Number</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>#{drawNumber}</Text>
            <Text style={styles.autoGeneratedText}>Auto-generated</Text>
          </View>
        </Animated.View>

        {/* Prize Amount */}
        <Animated.View
          entering={FadeInDown.delay(150).springify().damping(16).stiffness(140).mass(1)}
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
          entering={FadeInDown.delay(200).springify().damping(16).stiffness(140).mass(1)}
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
          entering={FadeInDown.delay(250).springify().damping(16).stiffness(140).mass(1)}
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

        {/* Create Button */}
        <Animated.View
          entering={FadeInDown.delay(300).springify().damping(16).stiffness(140).mass(1)}
          style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={handleCreate}
            style={styles.createButton}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create Draw</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <GroupPickerModal />
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
    fontFamily: 'Satoshi-Black',
    color: '#121723',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Satoshi-Regular',
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
    fontFamily: 'Satoshi-Bold',
    color: '#121723',
    marginBottom: 12,
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
    fontFamily: 'Satoshi-Regular',
    color: '#121723',
  },
  placeholderText: {
    color: '#999',
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
    fontSize: 18,
    fontFamily: 'Satoshi-Black',
    color: '#121723',
  },
  autoGeneratedText: {
    fontSize: 12,
    fontFamily: 'Satoshi-Regular',
    color: '#666',
    fontStyle: 'italic',
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
    fontFamily: 'Satoshi-Bold',
    color: '#121723',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Satoshi-Regular',
    color: '#121723',
    paddingVertical: 10,
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Satoshi-Regular',
    color: '#999',
    marginTop: 8,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  createButton: {
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
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Satoshi-Black',
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
    maxHeight: '70%',
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
    fontFamily: 'Satoshi-Black',
    color: '#121723',
  },
  modalList: {
    maxHeight: 400,
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
    fontFamily: 'Satoshi-Regular',
    color: '#121723',
  },
  modalItemTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'Satoshi-Bold',
  },
});

export default CreateDrawScreen;
