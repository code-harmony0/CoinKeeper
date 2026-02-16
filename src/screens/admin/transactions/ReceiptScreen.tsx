/**
 * ReceiptScreen
 * Generate PDF receipts for contributions and share via WhatsApp or general share
 * Uses existing receiptService.ts for PDF generation
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import firestore from '@react-native-firebase/firestore';
import {
  ArrowLeft, FileText, Share2, MessageCircle, Search,
  CheckCircle, Clock, AlertTriangle, Download, X,
} from 'lucide-react-native';
import { COLORS } from '../../../theme/colors';
import {
  generateReceipt,
  shareReceipt,
  shareReceiptWhatsApp,
  generateAndShareReceipt,
} from '../../../services/receiptService';
import type { Contribution } from '../../../types/transaction';

const SPRING_CONFIG = { damping: 16, stiffness: 140, mass: 1 };

const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid': return '#2E7D32';
    case 'pending': return '#F57C00';
    case 'overdue': return '#D32F2F';
    case 'failed': return '#D32F2F';
    default: return '#999';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'paid': return CheckCircle;
    case 'pending': return Clock;
    case 'overdue': return AlertTriangle;
    default: return Clock;
  }
};

const formatDate = (timestamp: any): string => {
  if (!timestamp) return 'N/A';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

interface Props {
  navigation: any;
  route?: any;
}

export const ReceiptScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [showShareOptions, setShowShareOptions] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // Load paid contributions for receipt generation
  useEffect(() => {
    const unsubscribe = firestore()
      .collection('contributions')
      .where('status', '==', 'paid')
      .orderBy('paidDate', 'desc')
      .limit(50)
      .onSnapshot(
        snapshot => {
          const data = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
              id: doc.id,
              groupId: d.groupId || '',
              groupName: d.groupName || '',
              memberId: d.memberId || '',
              memberName: d.memberName || '',
              userName: d.userName || d.memberName || '',
              amount: d.amount || 0,
              dueDate: d.dueDate,
              paidDate: d.paidDate,
              paidAt: d.paidAt || d.paidDate,
              status: d.status || 'paid',
              cycleNumber: d.cycleNumber,
              paymentMethod: d.paymentMethod || 'N/A',
              transactionId: d.transactionId || '',
              notes: d.notes || '',
            } as Contribution;
          });
          setContributions(data);
          setIsLoading(false);
        },
        error => {
          console.error('[ReceiptScreen] Error loading contributions:', error);
          setIsLoading(false);
        }
      );

    return () => unsubscribe();
  }, []);

  const filteredContributions = contributions.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.memberName?.toLowerCase().includes(q) ||
      c.userName?.toLowerCase().includes(q) ||
      c.groupName?.toLowerCase().includes(q) ||
      c.transactionId?.toLowerCase().includes(q)
    );
  });

  const handleGenerateReceipt = useCallback(async (contribution: Contribution) => {
    setGeneratingId(contribution.id);
    ReactNativeHapticFeedback.trigger('impactMedium');
    try {
      const filePath = await generateReceipt(contribution);
      if (filePath) {
        ReactNativeHapticFeedback.trigger('notificationSuccess');
        Alert.alert(
          'Receipt Generated',
          'PDF receipt has been created successfully.',
          [
            { text: 'Share', onPress: () => handleShare(filePath) },
            { text: 'WhatsApp', onPress: () => handleWhatsAppShare(filePath, contribution) },
            { text: 'OK' },
          ]
        );
      }
    } catch (error) {
      console.error('[ReceiptScreen] Generate error:', error);
      ReactNativeHapticFeedback.trigger('notificationError');
      Alert.alert('Error', 'Failed to generate receipt. Please try again.');
    } finally {
      setGeneratingId(null);
    }
  }, []);

  const handleShare = async (filePath: string) => {
    try {
      await shareReceipt(filePath);
    } catch (error) {
      console.error('[ReceiptScreen] Share error:', error);
    }
  };

  const handleWhatsAppShare = async (filePath: string, contribution: Contribution) => {
    try {
      await shareReceiptWhatsApp(filePath);
    } catch (error) {
      console.error('[ReceiptScreen] WhatsApp share error:', error);
      Alert.alert('Error', 'Failed to share via WhatsApp. Make sure WhatsApp is installed.');
    }
  };

  const handleQuickShare = useCallback(async (contribution: Contribution, method: 'general' | 'whatsapp') => {
    setGeneratingId(contribution.id);
    ReactNativeHapticFeedback.trigger('impactMedium');
    try {
      await generateAndShareReceipt(contribution, method);
      ReactNativeHapticFeedback.trigger('notificationSuccess');
    } catch (error) {
      console.error('[ReceiptScreen] Quick share error:', error);
      ReactNativeHapticFeedback.trigger('notificationError');
      Alert.alert('Error', 'Failed to generate and share receipt.');
    } finally {
      setGeneratingId(null);
      setShowShareOptions(null);
    }
  }, []);

  const renderContribution = useCallback(({ item, index }: { item: Contribution; index: number }) => {
    const StatusIcon = getStatusIcon(item.status);
    const statusColor = getStatusColor(item.status);
    const isGenerating = generatingId === item.id;
    const showOptions = showShareOptions === item.id;

    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 40, 300)).springify(SPRING_CONFIG)}>
        <View style={styles.contributionCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.statusIcon, { backgroundColor: `${statusColor}20` }]}>
              <StatusIcon size={18} color={statusColor} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.memberName} numberOfLines={1}>
                {item.userName || item.memberName}
              </Text>
              <Text style={styles.groupName} numberOfLines={1}>
                {item.groupName || 'Unknown Group'}
              </Text>
            </View>
            <View style={styles.amountContainer}>
              <Text style={styles.amount}>
                {'\u20B9'}{item.amount.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.date}>{formatDate(item.paidDate || item.paidAt)}</Text>
            </View>
          </View>

          {/* Payment Details */}
          <View style={styles.detailsRow}>
            {item.paymentMethod && item.paymentMethod !== 'N/A' && (
              <View style={styles.detailChip}>
                <Text style={styles.detailChipText}>{item.paymentMethod}</Text>
              </View>
            )}
            {item.transactionId && (
              <Text style={styles.txnId} numberOfLines={1}>
                TXN: {item.transactionId.slice(0, 12)}...
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          {!showOptions ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.generateButton}
                onPress={() => handleGenerateReceipt(item)}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Download size={16} color="#FFFFFF" />
                    <Text style={styles.generateButtonText}>Generate PDF</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOptionsButton}
                onPress={() => {
                  ReactNativeHapticFeedback.trigger('selection');
                  setShowShareOptions(item.id);
                }}
              >
                <Share2 size={16} color={COLORS.primaryBlue} />
                <Text style={styles.shareOptionsText}>Quick Share</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.shareRow}>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={() => handleQuickShare(item, 'general')}
                disabled={isGenerating}
              >
                <Share2 size={16} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareButton, styles.whatsappButton]}
                onPress={() => handleQuickShare(item, 'whatsapp')}
                disabled={isGenerating}
              >
                <MessageCircle size={16} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelShareButton}
                onPress={() => setShowShareOptions(null)}
              >
                <X size={16} color="#999" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }, [generatingId, showShareOptions]);

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <FileText size={48} color="#CCC" />
        <Text style={styles.emptyTitle}>No Paid Contributions</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery ? 'No results match your search' : 'Receipts can be generated for paid contributions'}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.springify(SPRING_CONFIG)} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color="#121723" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Receipts</Text>
          <Text style={styles.headerSubtitle}>Generate & share payment receipts</Text>
        </View>
      </Animated.View>

      {/* Search */}
      <Animated.View entering={FadeInDown.delay(30).springify(SPRING_CONFIG)} style={styles.searchContainer}>
        <Search size={18} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search member, group, transaction..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </Animated.View>

      {/* Stats */}
      <Animated.View entering={FadeInDown.delay(60).springify(SPRING_CONFIG)} style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{contributions.length}</Text>
          <Text style={styles.statLabel}>Paid Contributions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {'\u20B9'}{contributions.reduce((sum, c) => sum + c.amount, 0).toLocaleString('en-IN')}
          </Text>
          <Text style={styles.statLabel}>Total Amount</Text>
        </View>
      </Animated.View>

      {/* Contribution List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primaryBlue} />
          <Text style={styles.loadingText}>Loading contributions...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredContributions}
          keyExtractor={item => item.id}
          renderItem={renderContribution}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C2DFF7' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, gap: 14,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 24, fontFamily: 'PlusJakartaSans-Bold', color: '#121723' },
  headerSubtitle: { fontSize: 13, fontFamily: 'PlusJakartaSans-Regular', color: '#666' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    marginHorizontal: 20, borderRadius: 14, paddingHorizontal: 14, height: 44,
    gap: 10, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  searchInput: {
    flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans-Regular', color: '#121723', padding: 0,
  },
  statsRow: {
    flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16,
  },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statValue: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: '#121723' },
  statLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: '#999', marginTop: 4 },
  contributionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: {
    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  memberName: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: '#121723' },
  groupName: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', color: '#999', marginTop: 2 },
  amountContainer: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: '#2E7D32' },
  date: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', color: '#999', marginTop: 2 },
  detailsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingLeft: 48,
  },
  detailChip: {
    backgroundColor: '#F0F0F0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  detailChipText: { fontSize: 10, fontFamily: 'PlusJakartaSans-Medium', color: '#666' },
  txnId: { fontSize: 10, fontFamily: 'PlusJakartaSans-Regular', color: '#999', flex: 1 },
  actionRow: {
    flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  generateButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#121723', borderRadius: 12, height: 40, gap: 8,
  },
  generateButtonText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: '#FFFFFF' },
  shareOptionsButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EBF5FF', borderRadius: 12, height: 40, paddingHorizontal: 16, gap: 6,
  },
  shareOptionsText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: COLORS.primaryBlue },
  shareRow: {
    flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  shareButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primaryBlue, borderRadius: 12, height: 40, gap: 6,
  },
  whatsappButton: { backgroundColor: '#25D366' },
  shareButtonText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: '#FFFFFF' },
  cancelShareButton: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0F0F0',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: '#121723', marginTop: 16 },
  emptySubtitle: { fontSize: 14, fontFamily: 'PlusJakartaSans-Regular', color: '#999', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  loadingText: { fontSize: 15, fontFamily: 'PlusJakartaSans-Medium', color: '#666', marginTop: 12 },
});

export default ReceiptScreen;
