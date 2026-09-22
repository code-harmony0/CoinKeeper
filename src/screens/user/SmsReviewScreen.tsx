import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSpecTheme } from '../../theme/specTheme';
import { ChevronLeft, Inbox, CheckCircle2, RefreshCw } from 'lucide-react-native';
import { PressableScale } from '../../components/anim';
import { fetchRecentSms, parseSmsToDraft } from '../../services/smsParserService';
import { useTransactionsContext } from '../../context/TransactionsContext';
import { SmsInboxRow } from '../../components/transaction/SmsInboxRow';
import { MerchantLearningService } from '../../services/MerchantLearningService';
import { TransactionDraft } from '../../types/transactionDraft';
import { CategoryPickerSheet, PickableCategory } from '../../components/transaction/CategoryPickerSheet';
import { getDb } from '../../store/database';
import { FlashList } from '@shopify/flash-list';
import { AppDialog, type DialogAction } from '../../components/ui/AppDialog';
import { SmsMissLog } from '../../services/sms/smsMissLog';
import { getImportedSmsIds, useTransactionStore } from '../../store/transactionStore';
import { getPreference, setPreference } from '../../store/database';

/** How far back an inbox scan reaches, in messages. */
const SMS_SCAN_LIMIT = 2000;
/**
 * When the last full read of the inbox finished. Kept so the everyday case —
 * "has anything arrived since?" — reads a handful of new messages instead of
 * grinding through the whole inbox again on every visit.
 */
const LAST_SCAN_KEY = 'sms_last_scanned_at';
/** How often the scan yields so the progress count can actually render. */
const PROGRESS_EVERY = 25;

type InboxRow =
  | { kind: 'header'; title: string }
  | { kind: 'draft'; draft: TransactionDraft };

export const SmsReviewScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius } = useSpecTheme();
  const { addTransaction } = useTransactionsContext();
  const addTransactions = useTransactionStore(state => state.addTransactions);
  const deleteImportedSms = useTransactionStore(state => state.deleteImportedSmsTransactions);

  const [loading, setLoading] = useState(true);
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  const [addProgress, setAddProgress] = useState<{ done: number; total: number } | null>(null);
  /**
   * One dialog, never a pile. Android's own alerts stack invisibly when a
   * second fires while the first is up, so dismissing one only revealed
   * another — which read as a dialog that refused to go away.
   */
  const [dialog, setDialog] = useState<{
    title: string;
    message?: string;
    actions: DialogAction[];
  } | null>(null);
  const [drafts, setDrafts] = useState<TransactionDraft[]>([]);
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);
  const [pickingCategoryForId, setPickingCategoryForId] = useState<string | null>(null);
  // category_id on a draft is always a real DB categories.id (from ML prediction lookup
  // or from CategoryPickerSheet) — never a display name. This map resolves those ids to
  // human-readable names for the inbox row badge, without changing what's stored on the draft.
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  /** null = show every bank. */
  const [bankFilter, setBankFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [ageFilter, setAgeFilter] = useState<'all' | '30d' | 'year'>('all');

  // One entry per bank present in the scan, biggest first. A person with four
  // accounts should not have to read four banks' messages interleaved.
  const banks = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; count: number }>();
    for (const d of drafts) {
      const id = d.bank_id ?? 'UNKNOWN';
      const existing = counts.get(id);
      if (existing) existing.count++;
      else counts.set(id, { id, name: d.bank_name ?? 'Unknown', count: 1 });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  }, [drafts]);

  // Whatever is on screen is also what "Add all" acts on, so a filter is the
  // way to import one bank, or just this month, without going row by row.
  const visibleDrafts = useMemo(() => {
    const cutoff =
      ageFilter === '30d'
        ? Date.now() - 30 * 24 * 60 * 60 * 1000
        : ageFilter === 'year'
          ? new Date(new Date().getFullYear(), 0, 1).getTime()
          : null;

    return drafts.filter(d => {
      if (bankFilter && (d.bank_id ?? 'UNKNOWN') !== bankFilter) return false;
      if (typeFilter !== 'all' && (d.type ?? 'expense') !== typeFilter) return false;
      if (cutoff !== null && new Date(d.date ?? 0).getTime() < cutoff) return false;
      return true;
    });
  }, [drafts, bankFilter, typeFilter, ageFilter]);

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

  const loadSms = async ({ full = false }: { full?: boolean } = {}) => {
    setLoading(true);
    try {
      // A busy inbox is mostly non-bank chatter: on a real 1,180-message
      // inbox the last 100 held only 6 transactions out of 400. Scan deep
      // enough that the first import actually reflects the user's history —
      // already-imported ones come back flagged as duplicates, not silently
      // doubled.
      const messages = await fetchRecentSms(SMS_SCAN_LIMIT);
      // Everything older than the last finished scan has already been offered,
      // and either imported or waved away. Re-reading all of it on every visit
      // is what turned opening this screen into a fifteen-second wait.
      const since = full ? 0 : Number(await getPreference(LAST_SCAN_KEY)) || 0;
      // Messages already saved would only come back to be rejected again.
      const imported = await getImportedSmsIds();
      const parsed: TransactionDraft[] = [];
      let newest = since;
      // Billers send two messages for one payment — Airtel's "we have processed
      // Rs 3004" and then "we've received Rs 3004" — and importing both doubled
      // the bill. Same name and amount within a day is held back as a duplicate.
      const lastSeenAt = new Map<string, number>();
      const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        const receivedAt = Number(m.date) || 0;
        if (receivedAt > newest) newest = receivedAt;
        if (receivedAt <= since) continue;
        if (!imported.has(m.id)) {
          // No model here: the rules already read the formats banks send, and a
          // model call per unrecognised message is what made scans look frozen.
          const result = await parseSmsToDraft(m, { useModel: false });
          if (result) {
            const key = `${(result.merchant_name ?? '').toLowerCase()}|${result.amount_paise}`;
            const previous = lastSeenAt.get(key);
            if (previous !== undefined && Math.abs(previous - receivedAt) <= DUPLICATE_WINDOW_MS) {
              result.is_duplicate = true;
            }
            lastSeenAt.set(key, receivedAt);
            parsed.push(result);
          }
        }
        if (i % PROGRESS_EVERY === 0) {
          setScanProgress({ done: i, total: messages.length });
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      // One trim for the whole scan, not one per unparsed message.
      await SmsMissLog.trim().catch(() => undefined);
      if (newest > 0) await setPreference(LAST_SCAN_KEY, String(newest));
      setDrafts(parsed);
      loadCategoryNames(parsed.map(d => d.category_id).filter((id): id is string => !!id));
      // Out of the scanning state before the question is asked, or the screen
      // behind the prompt still reads "Scanning… 1200 / 1204" and the import
      // that follows looks like a scan that never finished.
      setScanProgress(null);
      setLoading(false);
      promptAddAll(parsed);
    } catch (e) {
      console.warn(e);
      Alert.alert(
        'Cannot read SMS',
        e instanceof Error ? e.message : 'Failed to read SMS',
      );
    } finally {
      setScanProgress(null);
      setLoading(false);
    }
  };

  const toTransaction = async (item: TransactionDraft) => {
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

    return {
      amountPaise: item.amount_paise || 0,
      // The parser already worked out whether this was money in or out.
      type: item.type ?? 'expense',
      category: categoryName,
      categoryIcon,
      description: item.merchant_name || 'Unknown',
      date: item.date || new Date().toISOString(),
      paymentMethod: item.payment_method || 'UPI',
      bankId: item.bank_id,
      smsId: item.sms_id,
    };
  };

  const learnFrom = async (item: TransactionDraft) => {
    if (item.merchant_name && item.category_id) {
      await MerchantLearningService.learnCorrection(item.merchant_name, item.category_id);
      await MerchantLearningService.updateFrequency(item.merchant_name, item.category_id);
    }
  };

  /**
   * Throws away what SMS put in the ledger and reads the inbox again, so
   * messages imported under older, worse parsing come back named properly.
   * Only SMS imports are removed — nothing typed in by hand.
   */
  const handleReimport = () => {
    setDialog({
      title: 'Read SMS again',
      message:
        'Check for messages that arrived since the last scan, or throw away what SMS put in the ledger and read the whole inbox from scratch. Anything you added yourself is never touched.',
      actions: [
        { label: 'Check for new', onPress: () => void loadSms() },
        {
          label: 'Re-import everything',
          destructive: true,
          onPress: async () => {
            setLoading(true);
            const removed = await deleteImportedSms();
            setBulkSummary(`${removed} removed — reading your whole inbox again`);
            await loadSms({ full: true });
          },
        },
        { label: 'Cancel', cancel: true },
      ],
    });
  };

  const approveOne = async (item: TransactionDraft): Promise<boolean> => {
    try {
      await addTransaction(await toTransaction(item));
      await learnFrom(item);
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
    visibleDrafts.forEach(item => ((item.confidence || 0) >= 90 ? high : low).push(item));
    return { highConf: high, lowConf: low };
  }, [visibleDrafts]);

  // Likely duplicates stay behind for a deliberate look.
  const addable = useMemo(() => visibleDrafts.filter(d => !d.is_duplicate), [visibleDrafts]);

  // Section titles and rows as one flat stream, so the whole inbox can go
  // through a single virtualized list instead of being rendered at once.
  const rows = useMemo<InboxRow[]>(() => {
    const out: InboxRow[] = [];
    if (highConf.length > 0) {
      out.push({ kind: 'header', title: 'Ready to Approve' });
      highConf.forEach(draft => out.push({ kind: 'draft', draft }));
    }
    if (lowConf.length > 0) {
      out.push({ kind: 'header', title: 'Needs Review' });
      lowConf.forEach(draft => out.push({ kind: 'draft', draft }));
    }
    return out;
  }, [highConf, lowConf]);

  // Asked once, right after a scan: going through a few hundred messages one
  // at a time is not a real option.
  const promptAddAll = (found: TransactionDraft[]) => {
    const batch = found.filter(d => !d.is_duplicate);
    if (batch.length === 0) return;

    setDialog({
      title: `${batch.length} transaction${batch.length === 1 ? '' : 's'} found`,
      message: 'Add them all to your Transactions, or go through them one by one?',
      actions: [
        { label: `Add all ${batch.length}`, onPress: () => void handleAddAll(batch) },
        { label: 'One by one', cancel: true },
      ],
    });
  };

  const handleAddAll = async (list?: TransactionDraft[]) => {
    if (addingAll) return;
    setAddingAll(true);
    try {
      const batch = (list ?? addable).filter(d => !d.is_duplicate);
      setAddProgress({ done: 0, total: batch.length });

      const inputs = [];
      for (const item of batch) inputs.push(await toTransaction(item));

      // Counted in steps: a state update per row would spend the import
      // re-rendering instead of saving.
      const saved = batch.slice(
        0,
        await addTransactions(inputs, done => {
          if (done % PROGRESS_EVERY === 0 || done === batch.length) {
            setAddProgress({ done, total: batch.length });
          }
        }),
      );

      const savedIds = new Set(saved.map(item => item.id));
      setDrafts(prev => prev.filter(d => !savedIds.has(d.id)));

      const failed = batch.length - saved.length;
      setBulkSummary(
        failed === 0
          ? `${saved.length} transaction${saved.length === 1 ? '' : 's'} added`
          : `${saved.length} added, ${failed} failed — still in your inbox`,
      );
      setTimeout(() => setBulkSummary(null), 4000);
    } finally {
      setAddProgress(null);
      setAddingAll(false);
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

        <PressableScale
          onPress={handleReimport}
          testID="reimport-btn"
          style={[styles.backBtn, { backgroundColor: colors.chipBg }]}
        >
          <RefreshCw color={colors.textPrimary} size={20} />
        </PressableScale>
      </View>

      {bulkSummary && (
        <View style={[styles.summaryBanner, { backgroundColor: colors.success + '20' }]}>
          <CheckCircle2 size={16} color={colors.success} />
          <Text style={[styles.summaryBannerText, { color: colors.success }]}>{bulkSummary}</Text>
        </View>
      )}

      {banks.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroller}
          contentContainerStyle={styles.bankRow}
        >
          <PressableScale
            onPress={() => setBankFilter(null)}
            style={[
              styles.bankChip,
              {
                backgroundColor: bankFilter === null ? colors.textPrimary : colors.chipBg,
              },
            ]}
          >
            <Text
              style={[
                styles.bankChipText,
                { color: bankFilter === null ? colors.background : colors.textPrimary },
              ]}
            >
              All banks ({drafts.length})
            </Text>
          </PressableScale>
          {banks.map(b => (
            <PressableScale
              key={b.id}
              onPress={() => setBankFilter(b.id)}
              style={[
                styles.bankChip,
                { backgroundColor: bankFilter === b.id ? colors.textPrimary : colors.chipBg },
              ]}
            >
              <Text
                style={[
                  styles.bankChipText,
                  { color: bankFilter === b.id ? colors.background : colors.textPrimary },
                ]}
              >
                {b.name} ({b.count})
              </Text>
            </PressableScale>
          ))}
        </ScrollView>
      )}

      {!loading && drafts.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroller}
          contentContainerStyle={styles.bankRow}
        >
          {(
            [
              ['all', 'All'],
              ['expense', 'Money out'],
              ['income', 'Money in'],
            ] as const
          ).map(([value, label]) => (
            <PressableScale
              key={`type-${value}`}
              onPress={() => setTypeFilter(value)}
              style={[
                styles.bankChip,
                { backgroundColor: typeFilter === value ? colors.textPrimary : colors.chipBg },
              ]}
            >
              <Text
                style={[
                  styles.bankChipText,
                  { color: typeFilter === value ? colors.background : colors.textPrimary },
                ]}
              >
                {label}
              </Text>
            </PressableScale>
          ))}

          <View style={[styles.chipDivider, { backgroundColor: colors.textSecondary }]} />

          {(
            [
              ['all', 'Any date'],
              ['30d', 'Last 30 days'],
              ['year', 'This year'],
            ] as const
          ).map(([value, label]) => (
            <PressableScale
              key={`age-${value}`}
              onPress={() => setAgeFilter(value)}
              style={[
                styles.bankChip,
                { backgroundColor: ageFilter === value ? colors.textPrimary : colors.chipBg },
              ]}
            >
              <Text
                style={[
                  styles.bankChipText,
                  { color: ageFilter === value ? colors.background : colors.textPrimary },
                ]}
              >
                {label}
              </Text>
            </PressableScale>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          {scanProgress
            ? `Scanning SMS inbox… ${scanProgress.done} / ${scanProgress.total}`
            : 'Scanning SMS inbox...'}
        </Text>
      ) : visibleDrafts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Inbox size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Inbox Zero</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>All transactions are categorized.</Text>
        </View>
      ) : (
        // Virtualized. Rendering a few hundred swipeable rows in one pass
        // blocked the main thread for ~20s, which read as a scan stuck on its
        // last count — the phone was busy drawing, not scanning.
        <View style={styles.listWrap}>
          <FlashList
            data={rows}
            keyExtractor={item => (item.kind === 'header' ? `header-${item.title}` : item.draft.id)}
            getItemType={item => item.kind}
            renderItem={({ item }) =>
              item.kind === 'header' ? (
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 12 }]}>
                  {item.title}
                </Text>
              ) : (
                <SmsInboxRow
                  item={item.draft}
                  animate={false}
                  categoryName={item.draft.category_id ? categoryNames[item.draft.category_id] : undefined}
                  onApprove={() => handleApprove(item.draft)}
                  onReject={() => handleReject(item.draft.id)}
                  onChangeCategory={() => openCategoryPicker(item.draft.id)}
                />
              )
            }
            ListHeaderComponent={
              addable.length > 0 ? (
                <PressableScale
                  onPress={() => void handleAddAll()}
                  testID="add-all-btn"
                  style={[styles.addAllBtn, { backgroundColor: colors.success, borderRadius: cardRadius }]}
                >
                  <CheckCircle2 size={18} color="#fff" />
                  <Text style={styles.addAllText}>
                    {addProgress
                      ? `Adding ${addProgress.done} / ${addProgress.total}…`
                      : addingAll
                        ? 'Adding…'
                        : `Add all ${addable.length} to Transactions`}
                  </Text>
                </PressableScale>
              ) : null
            }
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ''}
        message={dialog?.message}
        actions={dialog?.actions ?? []}
        onClose={() => setDialog(null)}
      />

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
  // A horizontal ScrollView stretches its children on the cross axis, so
  // without a height of its own the chips inflated to fill whatever vertical
  // space was left — 500px-tall pills with the label stranded at the top.
  chipScroller: { flexGrow: 0, flexShrink: 0 },
  bankRow: { paddingHorizontal: 20, paddingBottom: 12, gap: 8, alignItems: 'center' },
  bankChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  bankChipText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold' },
  chipDivider: { width: 1, height: 20, alignSelf: 'center', marginHorizontal: 4, opacity: 0.25 },
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontFamily: 'Satoshi-Bold' },
  listWrap: { flex: 1 },
  empty: { textAlign: 'center', marginTop: 40, fontFamily: 'Satoshi-Medium' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 20, fontFamily: 'Satoshi-Bold', marginBottom: 8 },
  emptySub: { fontSize: 14, fontFamily: 'Satoshi-Medium' },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: 'Satoshi-Bold' },
  addAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, marginBottom: 24 },
  addAllText: { color: '#fff', fontSize: 15, fontFamily: 'Satoshi-Bold' },
  summaryBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 12, padding: 12, borderRadius: 12 },
  summaryBannerText: { fontFamily: 'Satoshi-Bold', fontSize: 13 },
});
