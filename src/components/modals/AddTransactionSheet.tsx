import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  ScrollView,
  Alert,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { getDb } from '../../store/database';
import { MerchantLearningService } from '../../services/MerchantLearningService';
import { TransactionDraftService } from '../../services/TransactionDraftService';
import { TransactionPredictionService, PredictionResult } from '../../services/TransactionPredictionService';
import { ReceiptScanService } from '../../services/ReceiptScanService';
import { fetchRecentSms, parseSmsToDraft, SmsMessage } from '../../services/smsParserService';
import { EntrySource, TransactionDraft } from '../../types/transactionDraft';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Animated, { FadeInUp, FadeOutUp, Layout } from 'react-native-reanimated';

// UI Components
import { TransactionEntryShell } from '../transaction/TransactionEntryShell';
import { TransactionEntryModeTabs } from '../transaction/TransactionEntryModeTabs';
import { PredictionBanner } from '../transaction/PredictionBanner';
import { CategoryPickerSheet, PickableCategory } from '../transaction/CategoryPickerSheet';
import { SmartSuggestionsSection } from '../transaction/SmartSuggestionsSection';
import { TransactionPreviewCard } from '../transaction/TransactionPreviewCard';
import { ReceiptPreviewCard } from '../transaction/ReceiptPreviewCard';
import { SmsInboxRow } from '../transaction/SmsInboxRow';
import { StickySaveBar } from '../transaction/StickySaveBar';

/**
 * How many messages back to look. A real inbox is mostly network and delivery
 * chatter — on this user's phone the five newest messages were all promos, so
 * a small window showed "no transactions found" however many bank alerts sat
 * just behind it.
 */
const SMS_INBOX_LIMIT = 300;
/** How many of the found transactions to offer; this is a quick-pick, not the inbox. */
const SMS_INBOX_SHOWN = 10;

interface Props {
  visible: boolean;
  initialType?: 'expense' | 'income';
  onClose: () => void;
  onSubmit: (draft: TransactionDraft, type: 'expense' | 'income') => void;
}

interface MerchantItem {
  merchant_name: string;
  category_id: string;
}

export const AddTransactionSheet: React.FC<Props> = ({
  visible,
  initialType = 'expense',
  onClose,
  onSubmit,
}) => {
  const { colors, cardRadius } = useSpecTheme();

  const [transactionType, setTransactionType] = useState<'expense' | 'income'>(initialType);

  // This component stays mounted across navigations, so useState's initial
  // value alone would ignore a later initialType change. Re-sync on each open
  // so "Add Income" actually lands on the Income tab.
  useEffect(() => {
    if (visible) setTransactionType(initialType);
  }, [visible, initialType]);

  const [draft, setDraft] = useState<TransactionDraft>(() => TransactionDraftService.createDraft('manual'));
  const [activeMode, setActiveMode] = useState<EntrySource>('manual');

  const [amountInput, setAmountInput] = useState('');
  const [merchantInput, setMerchantInput] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState<{ merchant_name: string; category_id: string }[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [budgetImpact, setBudgetImpact] = useState<{ exceedsBudget: boolean; remainingAfter: number, budgetTotal: number } | null>(null);

  // A guess the user can override. Their pick always beats the prediction.
  const [pickedCategoryId, setPickedCategoryId] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [categories, setCategories] = useState<PickableCategory[]>([]);

  // Manual mode: SmartSuggestionsSection data
  const [favorites, setFavorites] = useState<MerchantItem[]>([]);
  const [recents, setRecents] = useState<MerchantItem[]>([]);
  const [quickAmounts, setQuickAmounts] = useState<number[]>([]);

  // SMS mode
  const [smsDrafts, setSmsDrafts] = useState<TransactionDraft[]>([]);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [selectedSmsId, setSelectedSmsId] = useState<string | null>(null);

  // Scan mode
  const [receiptImageUri, setReceiptImageUri] = useState<string | undefined>(undefined);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const amountRef = useRef<TextInput>(null);

  // Load SmartSuggestionsSection data (Manual mode)
  useEffect(() => {
    const loadSuggestions = async () => {
      const [favs, recs] = await Promise.all([
        MerchantLearningService.getFavorites(3),
        MerchantLearningService.getRecent(5),
      ]);
      setFavorites(favs);
      setRecents(recs);

      const db = getDb();
      // amount_paise/occurred_at are the post-002 column names; `amount`/`date`
      // threw "no such column" and left the quick-amount chips permanently empty.
      const res = await db.execute(
        `SELECT DISTINCT amount_paise FROM transactions ORDER BY occurred_at DESC LIMIT 4`
      );
      if (res?.rows) {
        setQuickAmounts((res.rows as any[]).map(r => Number(r.amount_paise)));
      }

      const cats = await db.execute('SELECT id, name, icon, color FROM categories ORDER BY name ASC;');
      setCategories((cats?.rows ?? []) as unknown as PickableCategory[]);
    };
    if (visible) loadSuggestions();
  }, [visible]);

  // Autofocus amount on manual mode
  useEffect(() => {
    if (visible && activeMode === 'manual') {
      setTimeout(() => amountRef.current?.focus(), 400);
    }
  }, [visible, activeMode]);

  // Prediction Engine hook — manual mode only (SMS/scan drafts already carry their own prediction)
  useEffect(() => {
    if (activeMode !== 'manual') return;

    const runPredictions = async () => {
      const numAmount = parseFloat(amountInput) || 0;
      const updatedDraft = {
        ...draft,
        amount_paise: numAmount * 100,
        merchant_name: merchantInput.trim() || undefined,
        source: activeMode,
      };
      setDraft(updatedDraft);

      if (numAmount > 0 || updatedDraft.merchant_name) {
        try {
          const pred = await TransactionPredictionService.predict(updatedDraft);
          setPrediction(pred);
          const budget = await TransactionPredictionService.evaluateBudgetImpact(updatedDraft);
          setBudgetImpact(budget);
        } catch (e) {
          // A failed prediction must never become a category. This effect had
          // no catch, so when predict() threw on a stale column name the
          // rejection was swallowed, setPrediction never ran, and the save path
          // fell through to || 'unknown' — which is how every expense in the
          // app ended up mislabelled. Showing no suggestion is the honest
          // degradation.
          console.error('[runPredictions]', e);
          setPrediction(null);
          setBudgetImpact(null);
        }
      } else {
        setPrediction(null);
        setBudgetImpact(null);
      }
    };

    const debounce = setTimeout(runPredictions, 300);
    return () => clearTimeout(debounce);
  }, [amountInput, merchantInput, activeMode]);

  // Autocomplete Engine
  useEffect(() => {
    if (!merchantInput.trim() || !showAutocomplete) {
      setAutocompleteResults([]);
      return;
    }

    const search = async () => {
      const db = getDb();
      const res = await db.execute(
        'SELECT DISTINCT merchant_name, category_id FROM merchant_learning WHERE LOWER(merchant_name) LIKE ? LIMIT 3',
        [`%${merchantInput.trim().toLowerCase()}%`]
      );
      if (res?.rows) {
        setAutocompleteResults(res.rows as any);
      }
    };
    search();
  }, [merchantInput, showAutocomplete]);

  const loadSmsInbox = useCallback(async () => {
    setSmsLoading(true);
    setSmsError(null);
    try {
      const messages: SmsMessage[] = await fetchRecentSms(SMS_INBOX_LIMIT);
      const parsed: TransactionDraft[] = [];
      for (const m of messages) {
        // Rules only: the model would run per unrecognised message and stall
        // the sheet. The full inbox scan on the Inbox screen does the same.
        const result = await parseSmsToDraft(m, { useModel: false });
        if (result) parsed.push(result);
        if (parsed.length === SMS_INBOX_SHOWN) break;
      }
      setSmsDrafts(parsed);
    } catch (e) {
      // A denied permission is recoverable, so show the real reason rather than
      // a generic failure the user can't act on.
      setSmsError(e instanceof Error ? e.message : 'Could not read SMS inbox.');
    } finally {
      setSmsLoading(false);
    }
  }, []);

  const handleModeChange = async (mode: EntrySource) => {
    setActiveMode(mode);
    setDraft(prev => ({ ...prev, source: mode }));

    if (mode === 'sms' && smsDrafts.length === 0 && !smsLoading) {
      loadSmsInbox();
    }

    if (mode === 'scan' && !receiptImageUri) {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Camera Permission',
              message: 'CoinKeeper needs camera access to scan your receipts.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Permission Denied', 'Camera permission is required to scan receipts.');
            setActiveMode('manual');
            return;
          }
        }

        let result = await launchCamera({
          mediaType: 'photo',
          cameraType: 'back',
          quality: 0.8,
        });

        // Fallback for simulators without a camera
        if (result.errorCode === 'camera_unavailable') {
          Alert.alert('Camera Unavailable', 'Falling back to photo library.');
          result = await launchImageLibrary({
            mediaType: 'photo',
            quality: 0.8,
          });
        }

        if (result.assets && result.assets.length > 0 && result.assets[0].uri) {
          const uri = result.assets[0].uri;
          setReceiptImageUri(uri);
          setIsScanningReceipt(true);

          try {
            const scannedDraft = await ReceiptScanService.processReceiptImage(uri);
            setDraft({ ...scannedDraft, source: 'scan' });
            if (scannedDraft.amount_paise) setAmountInput((scannedDraft.amount_paise / 100).toString());
            if (scannedDraft.merchant_name) setMerchantInput(scannedDraft.merchant_name);

            const pred = await TransactionPredictionService.predict(scannedDraft);
            setPrediction(pred);

            if (!scannedDraft.merchant_name || !scannedDraft.amount_paise) {
              Alert.alert(
                'Partial Scan',
                "Couldn't read every field on this receipt — check the amount and merchant before saving."
              );
            }
          } catch (e) {
            console.error(e);
            Alert.alert('Scan Failed', "Couldn't read this receipt. Try a clearer, well-lit photo, or enter it manually.");
            setActiveMode('manual');
          } finally {
            setIsScanningReceipt(false);
          }
        } else {
          setActiveMode('manual');
        }
      } catch (err: any) {
        console.error(err);
        Alert.alert('Error', err?.message || 'Could not launch camera.');
        setActiveMode('manual');
      }
    }
  };

  const applySuggestionMerchant = (item: MerchantItem) => {
    setMerchantInput(item.merchant_name);
    setShowAutocomplete(false);
  };

  const applySuggestionAmount = (amountPaise: number) => {
    setAmountInput((amountPaise / 100).toString());
  };

  const applyMerchant = (merchant: string) => {
    setMerchantInput(merchant);
    setShowAutocomplete(false);
  };

  const selectSmsDraft = (item: TransactionDraft) => {
    setSelectedSmsId(item.id);
    setDraft({ ...item, source: 'sms' });
    setAmountInput(((item.amount_paise || 0) / 100).toString());
    setMerchantInput(item.merchant_name || '');
    setPrediction({
      categoryId: item.category_id || null,
      accountId: null,
      isRecurring: !!item.is_recurring_candidate,
      isDuplicate: !!item.is_duplicate,
      predictionReason: item.prediction_reason || null,
      confidence: item.confidence || 0,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    Keyboard.dismiss();

    // 'others' is a real seeded category. The old 'unknown' fallback was a bare
    // string that resolveCategoryId turned into a brand-new junk category row,
    // which then polluted the Categories screen, Money Map, and Reports.
    const finalCategory = effectiveCategoryId || 'others';
    const finalDraft: TransactionDraft = {
      ...draft,
      amount_paise: (parseFloat(amountInput) || 0) * 100,
      merchant_name: merchantInput.trim() || undefined,
      category_id: finalCategory,
      is_duplicate: prediction?.isDuplicate || false,
      prediction_reason: prediction?.predictionReason || undefined,
      receipt_image_uri: receiptImageUri || draft.receipt_image_uri,
    };

    if (finalDraft.merchant_name) {
      await MerchantLearningService.learnCorrection(finalDraft.merchant_name, finalCategory);
      await MerchantLearningService.updateFrequency(finalDraft.merchant_name, finalCategory);
    }

    setIsSuccess(true);
    setTimeout(() => {
      onSubmit(finalDraft, transactionType);
      setIsSuccess(false);
      setIsSaving(false);
      resetState();
      onClose();
    }, 600);
  };

  const resetState = () => {
    setAmountInput('');
    setMerchantInput('');
    setDraft(TransactionDraftService.createDraft('manual'));
    setPrediction(null);
    setBudgetImpact(null);
    setActiveMode('manual');
    setSmsDrafts([]);
    setSelectedSmsId(null);
    setReceiptImageUri(undefined);
  };

  const amountIsEmpty = parseFloat(amountInput) === 0 || amountInput === '';
  const merchantIsEmpty = merchantInput.trim().length === 0;
  const isValid = !amountIsEmpty && !merchantIsEmpty;

  // The user's pick wins over the guess, always.
  const effectiveCategoryId = pickedCategoryId || prediction?.categoryId || draft.category_id || null;
  const effectiveCategoryName =
    categories.find(c => c.id === effectiveCategoryId)?.name ?? undefined;

  const headerContext = `Add Expense • ${new Date().toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`;

  const footer = (
    <StickySaveBar
      onSave={handleSave}
      isValid={isValid}
      isLoading={isSaving}
      isSuccess={isSuccess}
      budgetImpact={budgetImpact}
      isRecurring={prediction?.isRecurring}
      category={effectiveCategoryName}
      amount={parseFloat(amountInput) || 0}
    />
  );

  return (
    <TransactionEntryShell visible={visible} onClose={onClose} footer={footer} headerContext={headerContext}>
      <View style={[styles.typeToggleRow, { backgroundColor: colors.chipBg, borderRadius: cardRadius }]}>
        <TouchableOpacity
          style={[styles.typeToggleBtn, transactionType === 'expense' && { backgroundColor: colors.card, borderRadius: cardRadius - 4 }]}
          onPress={() => setTransactionType('expense')}
        >
          <Text style={[styles.typeToggleText, { color: transactionType === 'expense' ? colors.textPrimary : colors.textSecondary }]}>Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeToggleBtn, transactionType === 'income' && { backgroundColor: colors.card, borderRadius: cardRadius - 4 }]}
          onPress={() => setTransactionType('income')}
        >
          <Text style={[styles.typeToggleText, { color: transactionType === 'income' ? colors.textPrimary : colors.textSecondary }]}>Income</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      <TransactionEntryModeTabs activeMode={activeMode} onModeChange={handleModeChange} />


        {activeMode === 'manual' && (
          <>
            {/* STEP 1: HERO AMOUNT */}
            <Animated.View layout={Layout.springify()} style={styles.heroAmountContainer}>
              <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>₹</Text>
              <TextInput
                ref={amountRef}
                style={[styles.heroAmountInput, { color: colors.textPrimary }]}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                value={amountInput}
                onChangeText={setAmountInput}
                keyboardType="decimal-pad"
                maxLength={9}
              />
            </Animated.View>

            {amountIsEmpty && (
              <SmartSuggestionsSection
                favorites={favorites}
                recents={recents}
                quickAmounts={quickAmounts}
                onSelectMerchant={applySuggestionMerchant}
                onSelectAmount={applySuggestionAmount}
              />
            )}

            {!amountIsEmpty && (
              <Animated.View entering={FadeInUp} exiting={FadeOutUp} layout={Layout.springify()} style={styles.dynamicContent}>
                <View style={[styles.inputGroup, { backgroundColor: colors.chipBg, borderRadius: cardRadius }]}>
                  <TextInput
                    style={[styles.merchantInput, { color: colors.textPrimary }]}
                    placeholder="Where did you spend?"
                    placeholderTextColor={colors.textSecondary}
                    value={merchantInput}
                    onChangeText={(text) => {
                      setMerchantInput(text);
                      setShowAutocomplete(true);
                    }}
                    onFocus={() => setShowAutocomplete(true)}
                  />
                </View>

                {showAutocomplete && autocompleteResults.length > 0 && (
                  <View style={[styles.autocompleteContainer, { backgroundColor: colors.surfaceElevated, borderRadius: cardRadius }]}>
                    {autocompleteResults.map((res, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.autocompleteRow}
                        onPress={() => applyMerchant(res.merchant_name)}
                      >
                        <Text style={[styles.autocompleteText, { color: colors.textPrimary }]}>{res.merchant_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Animated.View>
            )}

            {/* Always tappable once there's a merchant: a guess the user can
                correct, or an explicit prompt when nothing resolved. Without
                this there was no way to set a category at entry time at all. */}
            {!merchantIsEmpty && (
              <TouchableOpacity
                style={styles.dynamicContent}
                onPress={() => setPickerVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={
                  effectiveCategoryName
                    ? `Category ${effectiveCategoryName}. Tap to change.`
                    : 'Choose a category'
                }
              >
                <PredictionBanner
                  variant="manual"
                  category={effectiveCategoryName}
                  exceedsBudget={budgetImpact?.exceedsBudget}
                  budgetUsagePercent={budgetImpact ? ((budgetImpact.budgetTotal - budgetImpact.remainingAfter) / budgetImpact.budgetTotal) * 100 : undefined}
                  isDuplicate={prediction?.isDuplicate}
                  isRecurring={prediction?.isRecurring}
                />
              </TouchableOpacity>
            )}
          </>
        )}

        {activeMode === 'sms' && (
          <View style={styles.dynamicContent}>
            {selectedSmsId ? (
              <>
                <TransactionPreviewCard draft={draft} mode="sms" />
                <PredictionBanner
                  variant="inbox"
                  category={prediction?.categoryId}
                  confidence={prediction?.confidence}
                  isDuplicate={prediction?.isDuplicate}
                  isRecurring={prediction?.isRecurring}
                />
                <TouchableOpacity onPress={() => setSelectedSmsId(null)} style={styles.backToInbox}>
                  <Text style={{ color: colors.primaryAccent, fontFamily: 'Satoshi-Bold' }}>← Back to inbox</Text>
                </TouchableOpacity>
              </>
            ) : smsLoading ? (
              <View style={styles.centerState}>
                <ActivityIndicator color={colors.primaryAccent} />
                <Text style={[styles.centerStateText, { color: colors.textSecondary }]}>Reading messages…</Text>
              </View>
            ) : smsError ? (
              <View style={styles.centerState}>
                <Text style={[styles.centerStateText, { color: colors.textSecondary }]}>{smsError}</Text>
              </View>
            ) : smsDrafts.length === 0 ? (
              <View style={styles.centerState}>
                <Text style={[styles.centerStateText, { color: colors.textSecondary }]}>
                  No transaction-like messages found. You can still add this manually.
                </Text>
              </View>
            ) : (
              smsDrafts.map((item) => (
                <SmsInboxRow
                  key={item.id}
                  item={item}
                  onApprove={() => selectSmsDraft(item)}
                  onReject={() => setSmsDrafts(prev => prev.filter(d => d.id !== item.id))}
                  onChangeCategory={() => selectSmsDraft(item)}
                />
              ))
            )}
          </View>
        )}

        {activeMode === 'scan' && (
          <Animated.View layout={Layout.springify()} style={styles.dynamicContent}>
            <ReceiptPreviewCard imageUri={receiptImageUri} isScanning={isScanningReceipt} confidence={draft.confidence} />
            {!isScanningReceipt && receiptImageUri && (
              <>
                <TransactionPreviewCard draft={draft} mode="scan" />
                <PredictionBanner
                  variant="inbox"
                  category={prediction?.categoryId || draft.category_id}
                  confidence={prediction?.confidence}
                  isDuplicate={prediction?.isDuplicate}
                  isRecurring={prediction?.isRecurring}
                />
              </>
            )}
          </Animated.View>
        )}

      </ScrollView>

      <CategoryPickerSheet
        visible={pickerVisible}
        selectedCategoryId={effectiveCategoryId ?? undefined}
        onClose={() => setPickerVisible(false)}
        onSelect={(cat) => {
          setPickedCategoryId(cat.id);
          setPickerVisible(false);
          // Teach the model from the correction — learnCorrection already
          // refuses the unknown bucket, so this can only improve predictions.
          if (merchantInput.trim()) {
            MerchantLearningService.learnCorrection(merchantInput.trim(), cat.id);
          }
        }}
      />
    </TransactionEntryShell>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 16,
  },
  typeToggleRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: 4,
    marginVertical: 12,
    width: 200,
  },
  typeToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  typeToggleText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  heroAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  currencySymbol: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 40,
    marginRight: 8,
    marginTop: 8,
  },
  heroAmountInput: {
    fontFamily: 'Satoshi-Black',
    fontSize: 72,
    padding: 0,
    minWidth: 100,
    textAlign: 'center',
  },
  dynamicContent: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  inputGroup: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    marginBottom: 8,
  },
  merchantInput: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 22,
    padding: 0,
    textAlign: 'center',
  },
  autocompleteContainer: {
    marginTop: 4,
    overflow: 'hidden',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  autocompleteRow: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  autocompleteText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  centerState: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  centerStateText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    textAlign: 'center',
  },
  backToInbox: {
    paddingVertical: 12,
    alignItems: 'center',
  },
});
