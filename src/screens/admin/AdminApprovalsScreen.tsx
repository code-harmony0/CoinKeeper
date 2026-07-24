/**
 * AdminApprovalsScreen
 * Queue of pending transactions requiring admin action
 * Uses Firestore for real-time pending approvals
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Check, X, Clock, RefreshCw } from 'lucide-react-native';
import { theme } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from '@react-native-firebase/firestore';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// Transaction type for approvals
export interface ApprovalTransaction {
  id: string;
  userName: string;
  groupName: string;
  groupId: string;
  amount: number;
  date: Date;
  reference?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

export const AdminApprovalsScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [pendingTransactions, setPendingTransactions] = useState<ApprovalTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch pending transactions from Firestore
  useEffect(() => {
    setIsLoading(true);

    const db = getFirestore();
    const q = query(
      collection(db, 'pendingApprovals'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const transactions = snapshot.docs.map((docSnap: any) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            date: data.createdAt?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
          };
        }) as ApprovalTransaction[];
        setPendingTransactions(transactions);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[AdminApprovalsScreen] Error:', err);
        setError('Failed to load approvals');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleApprove = useCallback(async (id: string) => {
    ReactNativeHapticFeedback.trigger('notificationSuccess');
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'pendingApprovals', id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
      });
      // Update group/member totals would be done via Firestore trigger
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  }, []);

  const handleReject = useCallback(async (id: string) => {
    ReactNativeHapticFeedback.trigger('notificationError');
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'pendingApprovals', id), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading approvals...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View entering={FadeInUp.springify()} style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Approvals</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{pendingTransactions.length} Pending Requests</Text>
      </Animated.View>

      <FlatList
        data={pendingTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ApprovalCard 
            transaction={item} 
            onApprove={() => handleApprove(item.id)}
            onReject={() => handleReject(item.id)}
            index={index}
            colors={colors}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.success + '20' }]}>
              <Check size={32} color={colors.success} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>All Caught Up!</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No pending approvals at the moment.</Text>
          </View>
        }
      />
    </View>
  );
};

// ============================================
// APPROVAL CARD COMPONENT
// ============================================

const ApprovalCard = ({ 
  transaction, 
  onApprove, 
  onReject,
  index,
  colors 
}: { 
  transaction: ApprovalTransaction; 
  onApprove: () => void; 
  onReject: () => void;
  index: number;
  colors: any;
}) => (
  <Animated.View entering={FadeInDown.delay(index * 100).springify()} style={[styles.card, { backgroundColor: colors.card }]}>
    <View style={styles.cardHeader}>
      <View style={styles.userInfo}>
        <View style={[styles.avatar, { backgroundColor: colors.accent5 }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{transaction.userName.charAt(0)}</Text>
        </View>
        <View>
          <Text style={[styles.userName, { color: colors.text }]}>{transaction.userName}</Text>
          <Text style={[styles.groupName, { color: colors.textSecondary }]}>{transaction.groupName}</Text>
        </View>
      </View>
      <View style={[styles.amountBadge, { backgroundColor: colors.success + '20' }]}>
        <Text style={[styles.amount, { color: colors.success }]}>₹{transaction.amount.toLocaleString()}</Text>
      </View>
    </View>

    <View style={[styles.detailsRow, { borderBottomColor: colors.divider }]}>
      <View style={styles.detailItem}>
        <Clock size={14} color={colors.textTertiary} />
        <Text style={[styles.detailText, { color: colors.textTertiary }]}>{transaction.date.toLocaleDateString()}</Text>
      </View>
      {transaction.reference && (
        <Text style={[styles.referenceText, { color: colors.textSecondary, backgroundColor: colors.surfaceSecondary }]}>Ref: {transaction.reference}</Text>
      )}
    </View>

    <View style={styles.actions}>
      <Pressable
        style={({ pressed }) => [styles.rejectButton, { backgroundColor: colors.error + '15' }, pressed && styles.buttonPressed]}
        onPress={onReject}
      >
        <X size={20} color={colors.error} strokeWidth={2.5} />
        <Text style={[styles.rejectText, { color: colors.error }]}>Reject</Text>
      </Pressable>
      
      <Pressable
        style={({ pressed }) => [styles.approveButton, pressed && styles.buttonPressed]}
        onPress={onApprove}
      >
        <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={styles.approveText}>Approve</Text>
      </Pressable>
    </View>
  </Animated.View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 16,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#121723',
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  listContent: {
    padding: theme.spacing.md,
    gap: 16,
  },
  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    ...theme.shadows.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1565C0',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#121723',
  },
  groupName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  amountBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2E7D32',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  referenceText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // Actions
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFEBEE',
    gap: 8,
  },
  rejectText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C62828',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 16,
    backgroundColor: '#121723',
    gap: 8,
    ...theme.shadows.soft,
  },
  approveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  // Empty State
  emptyState: {
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121723',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
