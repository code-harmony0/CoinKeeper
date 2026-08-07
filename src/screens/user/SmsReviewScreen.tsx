import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSpecTheme } from '../../theme/specTheme';
import { ChevronLeft, Inbox, CheckCircle2 } from 'lucide-react-native';
import { PressableScale } from '../../components/anim';
import { fetchRecentSms, parseSmsToDraft } from '../../services/smsParserService';
import { useTransactionsContext } from '../../context/TransactionsContext';
import { SmsInboxRow } from '../../components/transaction/SmsInboxRow';
import { MerchantLearningService } from '../../services/MerchantLearningService';
import { EcosystemIntegrationService } from '../../services/EcosystemIntegrationService';
import { TransactionDraft } from '../../types/transactionDraft';

export const SmsReviewScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius } = useSpecTheme();
  const { addTransaction } = useTransactionsContext();
  
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<TransactionDraft[]>([]);
  
  useEffect(() => {
    loadSms();
  }, []);

  const loadSms = async () => {
    setLoading(true);
    try {
      const messages = await fetchRecentSms(100);
      const parsed = [];
      for (const m of messages) {
        const result = await parseSmsToDraft(m);
        if (result) parsed.push(result);
      }
      setDrafts(parsed);
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Failed to read SMS');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item: TransactionDraft, index: number) => {
    try {
      await addTransaction({
        amountPaise: item.amount_paise || 0,
        type: 'expense', // Needs better mapping for credit if we extract it, but assuming expense for now
        category: item.category_id || 'unknown',
        categoryIcon: 'other',
        description: item.merchant_name || 'Unknown',
        date: item.date || new Date().toISOString(),
        paymentMethod: item.payment_method || 'UPI'
      });
      
      if (item.merchant_name && item.category_id) {
        await MerchantLearningService.learnCorrection(item.merchant_name, item.category_id);
        await MerchantLearningService.updateFrequency(item.merchant_name, item.category_id);
      }
      
      await EcosystemIntegrationService.notifyDraftSaved(item);

      setDrafts(prev => prev.filter((_, i) => i !== index));
    } catch (e) {
      Alert.alert('Save Failed', 'Could not save transaction.');
    }
  };

  const handleReject = (index: number) => {
    setDrafts(prev => prev.filter((_, i) => i !== index));
  };

  // Group by confidence
  const { highConf, lowConf } = useMemo(() => {
    const high: Array<{item: TransactionDraft, idx: number}> = [];
    const low: Array<{item: TransactionDraft, idx: number}> = [];
    
    drafts.forEach((item, idx) => {
      const conf = item.confidence || 0;
      if (conf >= 90) high.push({ item, idx });
      else low.push({ item, idx });
    });
    
    return { highConf: high, lowConf: low };
  }, [drafts]);

  const handleBulkApproveHigh = async () => {
    for (const { item, idx } of highConf) {
      await handleApprove(item, idx);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <PressableScale onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.chipBg }]}>
            <ChevronLeft color={colors.textPrimary} size={24} />
          </PressableScale>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Inbox</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>Scanning SMS inbox...</Text>
        ) : drafts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Inbox size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Inbox Zero</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>All transactions are categorized.</Text>
          </View>
        ) : (
          <View>
            {/* High Confidence Section */}
            {highConf.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Ready to Approve</Text>
                  <PressableScale onPress={handleBulkApproveHigh} style={[styles.bulkBtn, { backgroundColor: colors.success + '20' }]}>
                    <CheckCircle2 size={16} color={colors.success} />
                    <Text style={[styles.bulkText, { color: colors.success }]}>Approve All ({highConf.length})</Text>
                  </PressableScale>
                </View>
                {highConf.map(({ item, idx }) => (
                  <SmsInboxRow 
                    key={idx} 
                    item={item} 
                    onApprove={() => handleApprove(item, idx)} 
                    onReject={() => handleReject(idx)}
                    onChangeCategory={() => {
                      Alert.alert('Change Category', 'Category picker would open here.');
                    }}
                  />
                ))}
              </View>
            )}

            {/* Low Confidence Section */}
            {lowConf.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 12 }]}>Needs Review</Text>
                {lowConf.map(({ item, idx }) => (
                  <SmsInboxRow 
                    key={idx} 
                    item={item} 
                    onApprove={() => handleApprove(item, idx)} 
                    onReject={() => handleReject(idx)}
                    onChangeCategory={() => {
                      Alert.alert('Change Category', 'Category picker would open here.');
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontFamily: 'Satoshi-Bold' },
  scroll: { paddingHorizontal: 20 },
  empty: { textAlign: 'center', marginTop: 40, fontFamily: 'Satoshi-Medium' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 20, fontFamily: 'Satoshi-Bold', marginBottom: 8 },
  emptySub: { fontSize: 14, fontFamily: 'Satoshi-Medium' },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: 'Satoshi-Bold' },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  bulkText: { fontSize: 13, fontFamily: 'Satoshi-Bold' },
});
