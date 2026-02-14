import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { CreditCard, Calendar, Bell, CheckCircle, Settings } from 'lucide-react-native';
import type { AutoDebitSchedule } from '../../../types/collection';
import firestore from '@react-native-firebase/firestore';

// Mock auto-debit schedules
const DUMMY_SCHEDULES: AutoDebitSchedule[] = [
  {
    id: '1',
    groupId: 'group1',
    groupName: 'Monthly Savings Group',
    memberId: 'member1',
    memberName: 'Krishna Murthy',
    memberPhone: '+919876543240',
    amount: 5000,
    frequency: 'monthly',
    dayOfMonth: 5,
    bankDetails: {
      accountNumber: '****1234',
      ifsc: 'HDFC0001234',
      bankName: 'HDFC Bank',
    },
    enabled: true,
    nextRunDate: firestore.Timestamp.fromDate(new Date(2026, 0, 5)),
    lastRunDate: firestore.Timestamp.fromDate(new Date(2025, 11, 5)),
    lastRunStatus: 'success',
    createdAt: firestore.Timestamp.now(),
    updatedAt: firestore.Timestamp.now(),
  },
  {
    id: '2',
    groupId: 'group2',
    groupName: 'Family Chit Fund',
    memberId: 'member2',
    memberName: 'Lakshmi Narayanan',
    memberPhone: '+919876543241',
    amount: 7500,
    frequency: 'monthly',
    dayOfMonth: 10,
    bankDetails: {
      accountNumber: '****5678',
      ifsc: 'ICIC0002345',
      bankName: 'ICICI Bank',
    },
    enabled: true,
    nextRunDate: firestore.Timestamp.fromDate(new Date(2026, 0, 10)),
    lastRunDate: firestore.Timestamp.fromDate(new Date(2025, 11, 10)),
    lastRunStatus: 'success',
    createdAt: firestore.Timestamp.now(),
    updatedAt: firestore.Timestamp.now(),
  },
  {
    id: '3',
    groupId: 'group3',
    groupName: 'Office Colleagues Fund',
    memberId: 'member3',
    memberName: 'Ganesh Iyer',
    memberPhone: '+919876543242',
    amount: 3000,
    frequency: 'monthly',
    dayOfMonth: 15,
    bankDetails: {
      accountNumber: '****9012',
      ifsc: 'SBI00034567',
      bankName: 'State Bank of India',
    },
    enabled: false,
    nextRunDate: firestore.Timestamp.fromDate(new Date(2026, 0, 15)),
    createdAt: firestore.Timestamp.now(),
    updatedAt: firestore.Timestamp.now(),
  },
];

const SPRING_CONFIG = {
  damping: 16,
  stiffness: 140,
  mass: 1,
};

interface Props {
  navigation: any;
}

const ScheduleCard: React.FC<{
  schedule: AutoDebitSchedule;
  index: number;
  onToggle: (id: string, enabled: boolean) => void;
  onPress: () => void;
}> = ({ schedule, index, onToggle, onPress }) => {
  const nextRun = schedule.nextRunDate.toDate();
  const formattedNextRun = nextRun.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const getStatusColor = () => {
    if (!schedule.enabled) return '#999';
    if (schedule.lastRunStatus === 'failed') return '#D32F2F';
    return '#5cb85c';
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify(SPRING_CONFIG)}>
      <TouchableOpacity
        onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight');
          onPress();
        }}
        style={[
          styles.scheduleCard,
          { borderLeftColor: getStatusColor(), borderLeftWidth: 5 },
        ]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <CreditCard size={20} color={schedule.enabled ? '#121723' : '#999'} />
            <View style={styles.headerInfo}>
              <Text style={[styles.memberName, !schedule.enabled && styles.disabledText]}>
                {schedule.memberName}
              </Text>
              <Text style={styles.groupName}>{schedule.groupName}</Text>
            </View>
          </View>
          <Switch
            value={schedule.enabled}
            onValueChange={value => {
              ReactNativeHapticFeedback.trigger('selection');
              onToggle(schedule.id, value);
            }}
            trackColor={{ false: '#CCCCCC', true: '#5cb85c' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Amount:</Text>
            <Text style={styles.value}>₹{schedule.amount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Frequency:</Text>
            <Text style={styles.value}>
              Monthly (Day {schedule.dayOfMonth})
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Next Run:</Text>
            <Text style={styles.value}>{formattedNextRun}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Bank:</Text>
            <Text style={styles.value}>
              {schedule.bankDetails.bankName} {schedule.bankDetails.accountNumber}
            </Text>
          </View>
        </View>

        {schedule.lastRunDate && (
          <View style={styles.cardFooter}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <CheckCircle size={14} color="#FFFFFF" />
              <Text style={styles.statusText}>
                Last run: {schedule.lastRunStatus || 'N/A'}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const AutoDebitSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [schedules, setSchedules] = useState(DUMMY_SCHEDULES);

  const handleToggleSchedule = (id: string, enabled: boolean) => {
    setSchedules(prev =>
      prev.map(s => (s.id === id ? { ...s, enabled } : s))
    );
    // TODO: Update in Firestore
  };

  const handleSchedulePress = (schedule: AutoDebitSchedule) => {
    console.log('Schedule pressed:', schedule.id);
    // TODO: Navigate to edit schedule screen
  };

  const handleAddSchedule = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    console.log('Add new schedule');
    // TODO: Navigate to add schedule screen
  };

  const activeCount = schedules.filter(s => s.enabled).length;
  const totalAmount = schedules
    .filter(s => s.enabled)
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top }]}
      edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(0).springify(SPRING_CONFIG)}
          style={styles.header}>
          <Text style={styles.headerTitle}>Auto-Debit Settings</Text>
          <Text style={styles.headerSubtitle}>
            {activeCount} active schedules • ₹{totalAmount.toLocaleString('en-IN')}/month
          </Text>
        </Animated.View>

        {/* Info Card */}
        <Animated.View
          entering={FadeInDown.delay(100).springify(SPRING_CONFIG)}
          style={styles.infoCard}>
          <Bell size={24} color="#2196F3" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How Auto-Debit Works</Text>
            <Text style={styles.infoText}>
              Payments are automatically collected on the scheduled date from members' bank accounts.
              You'll receive notifications for successful and failed transactions.
            </Text>
          </View>
        </Animated.View>

        {/* Schedules List */}
        <View style={styles.schedulesSection}>
          <Text style={styles.sectionTitle}>Active Schedules</Text>
          {schedules.map((schedule, index) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              index={index}
              onToggle={handleToggleSchedule}
              onPress={() => handleSchedulePress(schedule)}
            />
          ))}
        </View>

        {/* Add New Button */}
        <Animated.View
          entering={FadeInDown.delay(200).springify(SPRING_CONFIG)}
          style={styles.addButtonContainer}>
          <TouchableOpacity
            onPress={handleAddSchedule}
            style={styles.addButton}>
            <Settings size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add New Auto-Debit Schedule</Text>
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoContent: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1565C0',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#1976D2',
    lineHeight: 18,
  },
  schedulesSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
    marginBottom: 16,
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
    marginBottom: 2,
  },
  disabledText: {
    color: '#999',
  },
  groupName: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#666',
  },
  cardBody: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#666',
  },
  value: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#121723',
  },
  cardFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#FFFFFF',
  },
  addButtonContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  addButton: {
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
  addButtonText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
  },
});

export default AutoDebitSettingsScreen;
