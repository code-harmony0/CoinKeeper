import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  Trophy, Users, Calendar, DollarSign, Award, Clock,
  Lock, Bell, FileText, ChevronLeft, AlertCircle,
} from 'lucide-react-native';
import { useDrawDetails } from '../../../hooks/useDraws';
import { drawsService } from '../../../services/drawsService';
import { COLORS } from '../../../theme/colors';
import firestore from '@react-native-firebase/firestore';
import type { DrawBid } from '../../../types/draw';

// SPRING_CONFIG removed for chained methods

interface Props {
  navigation: any;
  route: { params: { drawId: string; draw?: any } };
}

// Audit logger for draw actions
const logDrawAudit = async (data: {
  drawId: string;
  action: string;
  performedBy: string;
  metadata?: Record<string, unknown>;
}) => {
  try {
    await firestore()
      .collection('auditLogs')
      .add({
        ...data,
        targetCollection: 'draws',
        targetId: data.drawId,
        timestamp: firestore.FieldValue.serverTimestamp(),
        createdAt: firestore.FieldValue.serverTimestamp(),
        actorType: 'admin',
        success: true,
      });
  } catch (err) {
    console.error('[DrawAudit] Failed to log:', err);
  }
};

const BidCard: React.FC<{
  bid: DrawBid;
  index: number;
  isHighestBid: boolean;
  isLocked: boolean;
  onSelectWinner?: () => void;
}> = ({ bid, index, isHighestBid, isLocked, onSelectWinner }) => {
  const submittedDate = bid.timestamp?.toDate?.() ?? new Date();
  const formattedTime = submittedDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const formattedDate = submittedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });

  const isWinner = bid.status === 'won';

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify().damping(16).stiffness(140).mass(1)}>
      <View style={[styles.bidCard, isWinner && styles.winnerBidCard, isHighestBid && !isWinner && styles.highestBidCard]}>
        <View style={styles.bidHeader}>
          <View style={styles.bidHeaderLeft}>
            <DollarSign size={20} color={isWinner ? COLORS.successGreen : isHighestBid ? COLORS.successGreen : '#121723'} />
            <View style={styles.bidderInfo}>
              <Text style={[styles.bidderName, isWinner && { color: COLORS.successGreen }]}>
                {bid.memberName}
              </Text>
              {isWinner && (
                <View style={styles.wonBadge}>
                  <Trophy size={12} color="#FFFFFF" />
                  <Text style={styles.wonBadgeText}>Winner</Text>
                </View>
              )}
              {isHighestBid && !isWinner && (
                <View style={styles.highestBadge}>
                  <Trophy size={12} color="#FFFFFF" />
                  <Text style={styles.highestBadgeText}>Highest Bid</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.bidAmountContainer}>
            <Text style={[styles.bidAmount, isWinner && { color: COLORS.successGreen }]}>
              ₹{bid.bidAmount.toLocaleString('en-IN')}
            </Text>
            {!isLocked && !isWinner && onSelectWinner && (
              <TouchableOpacity
                onPress={() => {
                  ReactNativeHapticFeedback.trigger('impactMedium');
                  onSelectWinner();
                }}
                style={styles.selectWinnerBtn}>
                <Award size={14} color="#FFFFFF" />
                <Text style={styles.selectWinnerText}>Select</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.bidFooter}>
          <View style={styles.bidTimeContainer}>
            <Clock size={12} color="#666" />
            <Text style={styles.bidTime}>
              {formattedTime} • {formattedDate}
            </Text>
          </View>
          {bid.status && (
            <Text style={[styles.bidStatus, { color: bid.status === 'won' ? COLORS.successGreen : bid.status === 'lost' ? COLORS.errorCoral : '#666' }]}>
              {bid.status.toUpperCase()}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

export const DrawDetailsScreen: React.FC<any> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const drawId = route.params.drawId;
  const { draw, isLoading, error } = useDrawDetails(drawId);
  const [bids, setBids] = useState<DrawBid[]>([]);
  const [bidsLoading, setBidsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch bids
  React.useEffect(() => {
    if (!drawId) return;
    setBidsLoading(true);
    drawsService.getDrawBids(drawId)
      .then(fetchedBids => {
        setBids(fetchedBids);
        setBidsLoading(false);
      })
      .catch(err => {
        console.error('[DrawDetails] Error fetching bids:', err);
        setBidsLoading(false);
      });
  }, [drawId]);

  // Winner Lock: draw is locked once completed
  const isLocked = draw?.status === 'completed' || draw?.status === 'cancelled';

  // Find highest bid
  const highestBid = useMemo(() => {
    if (bids.length === 0) return null;
    return bids.reduce((max, bid) => bid.bidAmount > max.bidAmount ? bid : max, bids[0]);
  }, [bids]);

  const handleSelectWinner = useCallback(async (bid: DrawBid) => {
    if (isLocked) {
      Alert.alert('Locked', 'This draw has been completed. Winner cannot be changed.');
      return;
    }

    Alert.alert(
      'Confirm Winner',
      `Select ${bid.memberName} as the winner with bid ₹${bid.bidAmount.toLocaleString('en-IN')}?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Winner',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              ReactNativeHapticFeedback.trigger('impactHeavy');

              // 1. Select winner in Firestore
              await drawsService.selectWinner(drawId, bid.memberId, bid.bidAmount);

              // 2. Log audit entry
              await logDrawAudit({
                drawId,
                action: 'winner_selected',
                performedBy: 'admin',
                metadata: {
                  winnerId: bid.memberId,
                  winnerName: bid.memberName,
                  winningBid: bid.bidAmount,
                  drawNumber: draw?.drawNumber,
                  groupName: draw?.groupName,
                },
              });

              // 3. Trigger notification (queue for push delivery)
              await firestore().collection('notificationLogs').add({
                type: 'alert',
                channel: 'push',
                recipientId: bid.memberId,
                message: `Congratulations! You won Draw #${draw?.drawNumber} with a bid of ₹${bid.bidAmount.toLocaleString('en-IN')}`,
                status: 'queued',
                groupId: draw?.groupId,
                retryCount: 0,
                maxRetries: 3,
                createdAt: firestore.FieldValue.serverTimestamp(),
              });

              // 4. Auto-create payment task audit entry
              await logDrawAudit({
                drawId,
                action: 'payment_tasks_created',
                performedBy: 'system',
                metadata: {
                  note: 'Auto-created payment tasks for non-winner members after draw completion',
                  participantCount: draw?.participantCount,
                },
              });

              ReactNativeHapticFeedback.trigger('notificationSuccess');
              Alert.alert('Winner Selected', `${bid.memberName} has been selected as the winner. Notifications sent.`);

              // Refresh bids to show updated statuses
              const updatedBids = await drawsService.getDrawBids(drawId);
              setBids(updatedBids);
            } catch (err) {
              console.error('[DrawDetails] Error selecting winner:', err);
              Alert.alert('Error', 'Failed to select winner. Please try again.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }, [drawId, draw, isLocked]);

  const handleStartBidding = useCallback(async () => {
    if (!draw) return;
    ReactNativeHapticFeedback.trigger('impactMedium');

    try {
      setActionLoading(true);
      await drawsService.updateDraw(drawId, { status: 'in_progress' });

      await logDrawAudit({
        drawId,
        action: 'bidding_started',
        performedBy: 'admin',
        metadata: { drawNumber: draw.drawNumber, groupName: draw.groupName },
      });

      ReactNativeHapticFeedback.trigger('notificationSuccess');
    } catch (err) {
      Alert.alert('Error', 'Failed to start bidding');
    } finally {
      setActionLoading(false);
    }
  }, [drawId, draw]);

  const handleSettleDraw = useCallback(async () => {
    if (!draw) return;
    ReactNativeHapticFeedback.trigger('impactHeavy');

    Alert.alert(
      'Settle Draw',
      'Mark this draw as settled? This confirms the prize has been disbursed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Settlement',
          onPress: async () => {
            try {
              setActionLoading(true);
              await drawsService.updateDraw(drawId, {
                settledAt: firestore.FieldValue.serverTimestamp(),
              } as any);

              await logDrawAudit({
                drawId,
                action: 'draw_settled',
                performedBy: 'admin',
                metadata: {
                  winnerName: draw.winnerName,
                  prizeAmount: draw.totalPrizeAmount,
                },
              });

              ReactNativeHapticFeedback.trigger('notificationSuccess');
              Alert.alert('Settled', 'Draw has been marked as settled.');
            } catch (err) {
              Alert.alert('Error', 'Failed to settle draw');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }, [drawId, draw]);

  // Loading
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primaryBlue} />
        <Text style={styles.loadingText}>Loading draw...</Text>
      </SafeAreaView>
    );
  }

  // Error
  if (error || !draw) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <AlertCircle size={48} color={COLORS.errorCoral} />
        <Text style={styles.errorText}>{error || 'Draw not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const scheduledDate = draw.scheduledDate?.toDate?.() ?? new Date();
  const formattedDate = scheduledDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const getStatusColor = () => {
    switch (draw.status) {
      case 'upcoming': return COLORS.primaryBlue;
      case 'in_progress': return COLORS.warningAmber;
      case 'completed': return COLORS.successGreen;
      case 'cancelled': return COLORS.textTertiary;
      default: return COLORS.textTertiary;
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top }]}
      edges={['top', 'left', 'right']}>
      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back Button + Header */}
        <Animated.View
          entering={FadeInDown.delay(0).springify().damping(16).stiffness(140).mass(1)}
          style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={24} color="#121723" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Draw #{draw.drawNumber}</Text>
              {isLocked && (
                <View style={styles.lockBadge}>
                  <Lock size={14} color="#FFFFFF" />
                  <Text style={styles.lockText}>Locked</Text>
                </View>
              )}
            </View>
            <Text style={styles.groupName}>{draw.groupName}</Text>
          </View>
        </Animated.View>

        {/* Draw Info Card */}
        <Animated.View
          entering={FadeInDown.delay(50).springify().damping(16).stiffness(140).mass(1)}
          style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Trophy size={24} color={COLORS.warningAmber} />
              <Text style={styles.infoLabel}>Prize Pool</Text>
              <Text style={styles.infoValue}>₹{draw.totalPrizeAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.infoItem}>
              <Users size={24} color={COLORS.primaryBlue} />
              <Text style={styles.infoLabel}>Participants</Text>
              <Text style={styles.infoValue}>{draw.participantCount}</Text>
            </View>
            <View style={styles.infoItem}>
              <DollarSign size={24} color={COLORS.successGreen} />
              <Text style={styles.infoLabel}>Bids</Text>
              <Text style={styles.infoValue}>{bids.length}</Text>
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
            entering={FadeInDown.delay(100).springify().damping(16).stiffness(140).mass(1)}
            style={styles.winnerCard}>
            <Award size={28} color={COLORS.warningAmber} />
            <View style={styles.winnerInfo}>
              <Text style={styles.winnerLabel}>Winner</Text>
              <Text style={styles.winnerName}>{draw.winnerName || 'Winner Selected'}</Text>
              <Text style={styles.winnerAmount}>
                Won with ₹{draw.winningBid?.toLocaleString('en-IN')}
              </Text>
            </View>
            <Lock size={20} color={COLORS.textTertiary} />
          </Animated.View>
        )}

        {/* Bids Section */}
        <Animated.View
          entering={FadeInDown.delay(150).springify().damping(16).stiffness(140).mass(1)}
          style={styles.bidsSection}>
          <Text style={styles.sectionTitle}>
            All Bids ({bids.length})
          </Text>
          {bidsLoading ? (
            <ActivityIndicator size="small" color={COLORS.primaryBlue} style={{ marginVertical: 20 }} />
          ) : bids.length === 0 ? (
            <View style={styles.noBids}>
              <Text style={styles.noBidsText}>No bids yet</Text>
            </View>
          ) : (
            bids.map((bid, index) => (
              <BidCard
                key={bid.id}
                bid={bid}
                index={index}
                isHighestBid={highestBid?.id === bid.id}
                isLocked={isLocked}
                onSelectWinner={draw.status === 'in_progress' ? () => handleSelectWinner(bid) : undefined}
              />
            ))
          )}
        </Animated.View>

        {/* Draw Audit Log */}
        <Animated.View
          entering={FadeInUp.delay(200).springify().damping(16).stiffness(140).mass(1)}
          style={styles.auditSection}>
          <View style={styles.auditHeader}>
            <FileText size={18} color="#666" />
            <Text style={styles.sectionTitle}>Audit Log</Text>
          </View>
          <DrawAuditLog drawId={drawId} />
        </Animated.View>

        {/* Action Buttons */}
        {draw.status === 'upcoming' && (
          <Animated.View
            entering={FadeInDown.delay(250).springify().damping(16).stiffness(140).mass(1)}
            style={styles.actionContainer}>
            <TouchableOpacity
              onPress={handleStartBidding}
              style={[styles.actionButton, styles.primaryButton]}>
              <Bell size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Open Bidding</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {draw.status === 'in_progress' && highestBid && (
          <Animated.View
            entering={FadeInDown.delay(250).springify().damping(16).stiffness(140).mass(1)}
            style={styles.actionContainer}>
            <TouchableOpacity
              onPress={() => handleSelectWinner(highestBid)}
              style={[styles.actionButton, styles.primaryButton]}>
              <Award size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Select Highest Bidder as Winner</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {draw.status === 'completed' && !(draw as any).settledAt && (
          <Animated.View
            entering={FadeInDown.delay(250).springify().damping(16).stiffness(140).mass(1)}
            style={styles.actionContainer}>
            <TouchableOpacity
              onPress={handleSettleDraw}
              style={[styles.actionButton, styles.successButton]}>
              <Text style={styles.actionButtonText}>Settle Draw</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {isLocked && (
          <Animated.View
            entering={FadeInUp.delay(300).springify().damping(16).stiffness(140).mass(1)}
            style={styles.lockedNotice}>
            <Lock size={16} color={COLORS.textTertiary} />
            <Text style={styles.lockedNoticeText}>
              This draw is locked. No further changes can be made.
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// Inline audit log component
const DrawAuditLog: React.FC<{ drawId: string }> = ({ drawId }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const unsubscribe = firestore()
      .collection('auditLogs')
      .where('targetId', '==', drawId)
      .where('targetCollection', '==', 'draws')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .onSnapshot(
        snapshot => {
          const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setLogs(entries);
          setLoading(false);
        },
        () => setLoading(false),
      );

    return () => unsubscribe();
  }, [drawId]);

  if (loading) {
    return <ActivityIndicator size="small" color={COLORS.textTertiary} style={{ marginVertical: 12 }} />;
  }

  if (logs.length === 0) {
    return (
      <Text style={styles.auditEmpty}>No audit entries yet</Text>
    );
  }

  return (
    <View>
      {logs.map((log, i) => {
        const ts = log.timestamp?.toDate?.();
        const time = ts ? ts.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
        return (
          <View key={log.id} style={[styles.auditEntry, i < logs.length - 1 && styles.auditEntryBorder]}>
            <View style={styles.auditDot} />
            <View style={styles.auditContent}>
              <Text style={styles.auditAction}>{log.action?.replace(/_/g, ' ')}</Text>
              <Text style={styles.auditTime}>{time} • by {log.performedBy || log.actorType}</Text>
            </View>
          </View>
        );
      })}
    </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Satoshi-Black',
    color: '#121723',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.textTertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  lockText: {
    fontSize: 11,
    fontFamily: 'Satoshi-Black',
    color: '#FFFFFF',
  },
  groupName: {
    fontSize: 16,
    fontFamily: 'Satoshi-Regular',
    color: '#666',
    marginTop: 4,
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
    fontFamily: 'Satoshi-Regular',
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontFamily: 'Satoshi-Black',
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
    fontFamily: 'Satoshi-Regular',
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: 'Satoshi-Black',
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
    borderLeftColor: COLORS.warningAmber,
  },
  winnerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  winnerLabel: {
    fontSize: 12,
    fontFamily: 'Satoshi-Regular',
    color: '#666',
    marginBottom: 4,
  },
  winnerName: {
    fontSize: 20,
    fontFamily: 'Satoshi-Black',
    color: '#121723',
    marginBottom: 4,
  },
  winnerAmount: {
    fontSize: 16,
    fontFamily: 'Satoshi-Bold',
    color: COLORS.warningAmber,
  },
  bidsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Satoshi-Black',
    color: '#121723',
    marginBottom: 16,
  },
  noBids: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  noBidsText: {
    fontSize: 14,
    fontFamily: 'Satoshi-Regular',
    color: '#999',
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
    borderColor: COLORS.successGreen,
    backgroundColor: '#F1F8F4',
  },
  winnerBidCard: {
    borderWidth: 2,
    borderColor: COLORS.warningAmber,
    backgroundColor: '#FFFDF0',
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
    fontFamily: 'Satoshi-Bold',
    color: '#121723',
    marginBottom: 4,
  },
  highestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successGreen,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  highestBadgeText: {
    fontSize: 10,
    fontFamily: 'Satoshi-Black',
    color: '#FFFFFF',
  },
  wonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningAmber,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  wonBadgeText: {
    fontSize: 10,
    fontFamily: 'Satoshi-Black',
    color: '#FFFFFF',
  },
  bidAmountContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  bidAmount: {
    fontSize: 18,
    fontFamily: 'Satoshi-Black',
    color: '#121723',
  },
  selectWinnerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121723',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  selectWinnerText: {
    fontSize: 11,
    fontFamily: 'Satoshi-Black',
    color: '#FFFFFF',
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
    fontFamily: 'Satoshi-Regular',
    color: '#666',
  },
  bidStatus: {
    fontSize: 11,
    fontFamily: 'Satoshi-Black',
  },
  auditSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  auditEmpty: {
    fontSize: 13,
    fontFamily: 'Satoshi-Regular',
    color: '#999',
    paddingVertical: 12,
  },
  auditEntry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  auditEntryBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  auditDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryBlue,
    marginTop: 5,
    marginRight: 12,
  },
  auditContent: {
    flex: 1,
  },
  auditAction: {
    fontSize: 14,
    fontFamily: 'Satoshi-Medium',
    color: '#121723',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  auditTime: {
    fontSize: 12,
    fontFamily: 'Satoshi-Regular',
    color: '#999',
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
    backgroundColor: COLORS.successGreen,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'Satoshi-Black',
    color: '#FFFFFF',
  },
  lockedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    gap: 8,
  },
  lockedNoticeText: {
    fontSize: 13,
    fontFamily: 'Satoshi-Regular',
    color: COLORS.textTertiary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Satoshi-Medium',
    color: '#666',
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Satoshi-Medium',
    color: COLORS.errorCoral,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#121723',
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Satoshi-Bold',
    color: '#FFFFFF',
  },
});

export default DrawDetailsScreen;
