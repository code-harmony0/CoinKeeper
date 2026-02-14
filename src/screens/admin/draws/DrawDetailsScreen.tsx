import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Trophy, Users, Calendar, DollarSign, Award, Clock } from 'lucide-react-native';
import type { Bid, Draw } from '../../../types/draw';
import firestore from '@react-native-firebase/firestore';

// Mock draw details with 8 dummy bids
const DUMMY_DRAW: Draw = {
  id: '1',
  groupId: 'group1',
  groupName: 'Monthly Savings Group',
  drawNumber: 12,
  scheduledDate: firestore.Timestamp.fromDate(new Date(2025, 11, 20)),
  status: 'in_progress',
  totalPrizeAmount: 50000,
  participantCount: 15,
  bidsReceived: 8,
  biddingOpen: true,
  createdAt: firestore.Timestamp.now(),
  updatedAt: firestore.Timestamp.now(),
};

const DUMMY_BIDS: Bid[] = [
  {
    id: '1',
    drawId: '1',
    groupId: 'group1',
    memberId: 'member1',
    memberName: 'Rajesh Kumar',
    bidAmount: 15000,
    submittedAt: firestore.Timestamp.fromDate(new Date(2025, 11, 6, 10, 30)),
    status: 'active',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '2',
    drawId: '1',
    groupId: 'group1',
    memberId: 'member2',
    memberName: 'Priya Sharma',
    bidAmount: 18000,
    submittedAt: firestore.Timestamp.fromDate(new Date(2025, 11, 6, 11, 15)),
    status: 'active',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '3',
    drawId: '1',
    groupId: 'group1',
    memberId: 'member3',
    memberName: 'Anil Patel',
    bidAmount: 12000,
    submittedAt: firestore.Timestamp.fromDate(new Date(2025, 11, 6, 12, 45)),
    status: 'active',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '4',
    drawId: '1',
    groupId: 'group1',
    memberId: 'member4',
    memberName: 'Sunita Reddy',
    bidAmount: 20000,
    submittedAt: firestore.Timestamp.fromDate(new Date(2025, 11, 6, 14, 20)),
    status: 'active',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '5',
    drawId: '1',
    groupId: 'group1',
    memberId: 'member5',
    memberName: 'Vikram Singh',
    bidAmount: 16500,
    submittedAt: firestore.Timestamp.fromDate(new Date(2025, 11, 6, 15, 10)),
    status: 'active',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '6',
    drawId: '1',
    groupId: 'group1',
    memberId: 'member6',
    memberName: 'Kavita Desai',
    bidAmount: 14000,
    submittedAt: firestore.Timestamp.fromDate(new Date(2025, 11, 6, 16, 30)),
    status: 'active',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '7',
    drawId: '1',
    groupId: 'group1',
    memberId: 'member7',
    memberName: 'Ramesh Gupta',
    bidAmount: 17500,
    submittedAt: firestore.Timestamp.fromDate(new Date(2025, 11, 6, 17, 45)),
    status: 'active',
    createdAt: firestore.Timestamp.now(),
  },
  {
    id: '8',
    drawId: '1',
    groupId: 'group1',
    memberId: 'member8',
    memberName: 'Meera Nair',
    bidAmount: 19000,
    submittedAt: firestore.Timestamp.fromDate(new Date(2025, 11, 6, 18, 20)),
    status: 'active',
    createdAt: firestore.Timestamp.now(),
  },
];

const SPRING_CONFIG = {
  damping: 16,
  stiffness: 140,
  mass: 1,
};

interface Props {
  navigation: any;
  route: any;
}

const BidCard: React.FC<{
  bid: Bid;
  index: number;
  isHighestBid: boolean;
}> = ({ bid, index, isHighestBid }) => {
  const submittedDate = bid.submittedAt.toDate();
  const formattedTime = submittedDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const formattedDate = submittedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify(SPRING_CONFIG)}>
      <View style={[styles.bidCard, isHighestBid && styles.highestBidCard]}>
        <View style={styles.bidHeader}>
          <View style={styles.bidHeaderLeft}>
            <DollarSign size={20} color={isHighestBid ? '#5cb85c' : '#121723'} />
            <View style={styles.bidderInfo}>
              <Text style={[styles.bidderName, isHighestBid && styles.highestBidText]}>
                {bid.memberName}
              </Text>
              {isHighestBid && (
                <View style={styles.highestBadge}>
                  <Trophy size={12} color="#FFFFFF" />
                  <Text style={styles.highestBadgeText}>Highest Bid</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={[styles.bidAmount, isHighestBid && styles.highestBidAmount]}>
            ₹{bid.bidAmount.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.bidFooter}>
          <View style={styles.bidTimeContainer}>
            <Clock size={12} color="#666" />
            <Text style={styles.bidTime}>
              {formattedTime} • {formattedDate}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

export const DrawDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [draw] = useState(DUMMY_DRAW);
  const [bids] = useState(DUMMY_BIDS);

  // Find highest bid
  const highestBid = bids.reduce((max, bid) =>
    bid.bidAmount > max.bidAmount ? bid : max
  , bids[0]);

  const scheduledDate = draw.scheduledDate.toDate();
  const formattedDate = scheduledDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const getStatusColor = () => {
    switch (draw.status) {
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

  const handleStartBidding = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    console.log('Start bidding');
    // TODO: Implement start bidding logic
  };

  const handleSelectWinner = () => {
    ReactNativeHapticFeedback.trigger('impactHeavy');
    console.log('Select winner');
    // TODO: Implement winner selection logic
  };

  const handleSettleDraw = () => {
    ReactNativeHapticFeedback.trigger('impactHeavy');
    console.log('Settle draw');
    // TODO: Implement settlement logic
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
          <Text style={styles.headerTitle}>Draw #{draw.drawNumber}</Text>
          <Text style={styles.groupName}>{draw.groupName}</Text>
        </Animated.View>

        {/* Draw Info Card */}
        <Animated.View
          entering={FadeInDown.delay(50).springify(SPRING_CONFIG)}
          style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Trophy size={24} color="#f0ad4e" />
              <Text style={styles.infoLabel}>Prize Pool</Text>
              <Text style={styles.infoValue}>₹{draw.totalPrizeAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.infoItem}>
              <Users size={24} color="#2196F3" />
              <Text style={styles.infoLabel}>Participants</Text>
              <Text style={styles.infoValue}>{draw.participantCount}</Text>
            </View>
            <View style={styles.infoItem}>
              <DollarSign size={24} color="#5cb85c" />
              <Text style={styles.infoLabel}>Bids</Text>
              <Text style={styles.infoValue}>{draw.bidsReceived}</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Calendar size={16} color="#666" />
              <Text style={styles.statusText}>Scheduled: {formattedDate}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusBadgeText}>{draw.status.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Winner Card (if completed) */}
        {draw.status === 'completed' && draw.winnerId && (
          <Animated.View
            entering={FadeInDown.delay(100).springify(SPRING_CONFIG)}
            style={styles.winnerCard}>
            <Award size={28} color="#f0ad4e" />
            <View style={styles.winnerInfo}>
              <Text style={styles.winnerLabel}>Winner</Text>
              <Text style={styles.winnerName}>{draw.winnerName}</Text>
              <Text style={styles.winnerAmount}>
                Won ₹{draw.winnerBidAmount?.toLocaleString('en-IN')}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Bids Section */}
        <Animated.View
          entering={FadeInDown.delay(150).springify(SPRING_CONFIG)}
          style={styles.bidsSection}>
          <Text style={styles.sectionTitle}>
            All Bids ({bids.length})
          </Text>
          {bids.map((bid, index) => (
            <BidCard
              key={bid.id}
              bid={bid}
              index={index}
              isHighestBid={bid.id === highestBid.id}
            />
          ))}
        </Animated.View>

        {/* Action Buttons */}
        {draw.status === 'upcoming' && (
          <Animated.View
            entering={FadeInDown.delay(200).springify(SPRING_CONFIG)}
            style={styles.actionContainer}>
            <TouchableOpacity
              onPress={handleStartBidding}
              style={[styles.actionButton, styles.primaryButton]}>
              <Text style={styles.actionButtonText}>Start Bidding</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {draw.status === 'in_progress' && (
          <Animated.View
            entering={FadeInDown.delay(200).springify(SPRING_CONFIG)}
            style={styles.actionContainer}>
            <TouchableOpacity
              onPress={handleSelectWinner}
              style={[styles.actionButton, styles.primaryButton]}>
              <Award size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Select Winner</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {draw.status === 'completed' && !draw.settledAt && (
          <Animated.View
            entering={FadeInDown.delay(200).springify(SPRING_CONFIG)}
            style={styles.actionContainer}>
            <TouchableOpacity
              onPress={handleSettleDraw}
              style={[styles.actionButton, styles.successButton]}>
              <Text style={styles.actionButtonText}>Settle Draw</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
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
  groupName: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
  },
  winnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#f0ad4e',
  },
  winnerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  winnerLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#666',
    marginBottom: 4,
  },
  winnerName: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
    marginBottom: 4,
  },
  winnerAmount: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#f0ad4e',
  },
  bidsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
    marginBottom: 16,
  },
  bidCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  highestBidCard: {
    borderWidth: 2,
    borderColor: '#5cb85c',
    backgroundColor: '#F1F8F4',
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bidHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bidderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  bidderName: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#121723',
    marginBottom: 4,
  },
  highestBidText: {
    color: '#5cb85c',
  },
  highestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5cb85c',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  highestBadgeText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
  },
  bidAmount: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#121723',
  },
  highestBidAmount: {
    color: '#5cb85c',
    fontSize: 20,
  },
  bidFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bidTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bidTime: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#666',
  },
  actionContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButton: {
    backgroundColor: '#121723',
  },
  successButton: {
    backgroundColor: '#5cb85c',
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
  },
});

export default DrawDetailsScreen;
