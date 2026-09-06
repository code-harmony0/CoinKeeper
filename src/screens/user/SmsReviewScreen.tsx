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
import { CategoryPickerSheet, PickableCategory } from '../../components/transaction/CategoryPickerSheet';
import { getDb } from '../../store/database';

export const SmsReviewScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius } = useSpecTheme();
  const { addTransaction } = useTransactionsContext();

  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<TransactionDraft[]>([]);
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);
  const [pickingCategoryForId, setPickingCategoryForId] = useState<string | null>(null);
  // category_id on a draft is always a real DB categories.id (from ML prediction lookup
  // or from CategoryPickerSheet) — never a display name. This map resolves those ids to
  // human-readable names for the inbox row badge, without changing what's stored on the draft.
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSms();
  }, []);

  const loadCategoryNames = async (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return;
    try {
      const db = getDb();
      const placeholders = uniqueIds.map(() => '?').join(', ');
      const res = await db.execute(`SELECT id, name FROM categories WHERE id IN (${placeholders});`, uniqueIds);
      const rows = (res?.rows ?? []) as { id: string; name: string }[];
      setCategoryNames(prev => {
        const next = { ...prev };
        rows.forEach(r => (next[r.id] = r.name));
        return next;
      });
    } catch (e) {
      console.warn(e);
    }
  };

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
      loadCategoryNames(parsed.map(d => d.category_id).filter((id): id is string => !!id));
    } catch (e) {
      console.warn(e);
      Alert.alert(
        'Cannot read SMS',
        e instanceof Error ? e.message : 'Failed to read SMS',
      );
    } finally {
      setLoading(false);
    }
  };

  const approveOne = async (item: TransactionDraft): Promise<boolean> => {
    try {
      // Resolve the draft's category_id (a real DB categories.id) to its actual name/icon
      // right before saving — addTransaction/resolveCategoryId look up categories by name,
      // so passing the id straight through would fail the lookup and spawn a duplicate
      // category literally named after the opaque id string.
      let categoryName = 'Other';
      let categoryIcon = 'other';
      if (item.category_id) {
        const db = getDb();
        const res = await db.execute('SELECT name, icon FROM categories WHERE id = ? LIMIT 1;', [item.category_id]);
        const row = (res?.rows?.[0] ?? undefined) as { name?: string; icon?: string } | undefined;
        if (row?.name) {
          categoryName = row.name;
          categoryIcon = row.icon || 'other';
        }
      }

      await addTransaction({
        amountPaise: item.amount_paise || 0,
        type: 'expense',
        category: categoryName,
        categoryIcon,
        description: item.merchant_name || 'Unknown',
        date: item.date || new Date().toISOString(),
        paymentMethod: item.payment_method || 'UPI',
      });

      if (item.merchant_name && item.category_id) {
        await MerchantLearningService.learnCorrection(item.merchant_name, item.category_id);
        await MerchantLearningService.updateFrequency(item.merchant_name, item.category_id);
      }

      await EcosystemIntegrationService.notifyDraftSaved(item);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleApprove = async (item: TransactionDraft) => {
    const ok = await approveOne(item);
    if (ok) {
      setDrafts(prev => prev.filter(d => d.id !== item.id));
    } else {
      Alert.alert('Save Failed', 'Could not save transaction.');
    }
  };

  const handleReject = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
  };

  const openCategoryPicker = (id: string) => setPickingCategoryForId(id);

  const applyCategory = (category: PickableCategory) => {
    if (!pickingCategoryForId) return;
    setDrafts(prev =>
      prev.map(d => (d.id === pickingCategoryForId ? { ...d, category_id: category.id } : d)),
    );
    setCategoryNames(prev => ({ ...prev, [category.id]: category.name }));
    setPickingCategoryForId(null);
  };

  const { highConf, lowConf } = useMemo(() => {
    const high: TransactionDraft[] = [];
    const low: TransactionDraft[] = [];
    drafts.forEach(item => ((item.confidence || 0) >= 90 ? high : low).push(item));
    return { highConf: high, lowConf: low };
  }, [drafts]);

  const handleBulkApproveHigh = async () => {
    const batch = highConf;
    const failedIds = new Set<string>();
    let succeeded = 0;

    for (const item of batch) {
      const ok = await approveOne(item);
      if (ok) succeeded++;
      else failedIds.add(item.id);
    }

    setDrafts(prev => prev.filter(d => !batch.some(b => b.id === d.id) || failedIds.has(d.id)));

    const failed = failedIds.size;
    setBulkSummary(
      failed === 0
        ? `${succeeded} transaction${succeeded === 1 ? '' : 's'} added`
        : `${succeeded} added, ${failed} failed — still in your inbox`,
    );
    setTimeout(() => setBulkSummary(null), 4000);
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

      {bulkSummary && (
        <View style={[styles.summaryBanner, { backgroundColor: colors.success + '20' }]}>
          <CheckCircle2 size={16} color={colors.success} />
          <Text style={[styles.summaryBannerText, { color: colors.success }]}>{bulkSummary}</Text>
        </View>
      )}

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
            {highConf.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Ready to Approve</Text>
                  <PressableScale onPress={handleBulkApproveHigh} style={[styles.bulkBtn, { backgroundColor: colors.success + '20' }]}>
                    <CheckCircle2 size={16} color={colors.success} />
                    <Text style={[styles.bulkText, { color: colors.success }]}>Approve All ({highConf.length})</Text>
                  </PressableScale>
                </View>
                {highConf.map(item => (
                  <SmsInboxRow
                    key={item.id}
                    item={item}
                    categoryName={item.category_id ? categoryNames[item.category_id] : undefined}
                    onApprove={() => handleApprove(item)}
                    onReject={() => handleReject(item.id)}
                    onChangeCategory={() => openCategoryPicker(item.id)}
                  />
                ))}
              </View>
            )}

            {lowConf.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 12 }]}>Needs Review</Text>
                {lowConf.map(item => (
                  <SmsInboxRow
                    key={item.id}
                    item={item}
                    categoryName={item.category_id ? categoryNames[item.category_id] : undefined}
                    onApprove={() => handleApprove(item)}
                    onReject={() => handleReject(item.id)}
                    onChangeCategory={() => openCategoryPicker(item.id)}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <CategoryPickerSheet
        visible={!!pickingCategoryForId}
        selectedCategoryId={drafts.find(d => d.id === pickingCategoryForId)?.category_id}
        onSelect={applyCategory}
        onClose={() => setPickingCategoryForId(null)}
      />
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
  summaryBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 12, padding: 12, borderRadius: 12 },
  summaryBannerText: { fontFamily: 'Satoshi-Bold', fontSize: 13 },
});
