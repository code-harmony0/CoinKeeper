import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { getDb } from '../../store/database';
import { MerchantLearningService } from '../../services/MerchantLearningService';
import { TransactionDraftService } from '../../services/TransactionDraftService';
import { TransactionPredictionService, PredictionResult } from '../../services/TransactionPredictionService';
import { EcosystemIntegrationService } from '../../services/EcosystemIntegrationService';
import { ReceiptScanService } from '../../services/ReceiptScanService';
import { EntrySource, TransactionDraft } from '../../types/transactionDraft';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Animated, { FadeInUp, FadeOutUp, Layout } from 'react-native-reanimated';

// UI Components
import { TransactionEntryShell } from '../transaction/TransactionEntryShell';
import { TransactionEntryModeTabs } from '../transaction/TransactionEntryModeTabs';
import { AiAssistantCard } from '../transaction/AiAssistantCard';
import { TimelineSuggestions } from '../transaction/TimelineSuggestions';
import { TransactionPreviewCard } from '../transaction/TransactionPreviewCard';
import { StickySaveBar } from '../transaction/StickySaveBar';
import * as Icons from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (draft: TransactionDraft) => void;
}

export const AddTransactionSheet: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { colors, cardRadius } = useSpecTheme();

  const [draft, setDraft] = useState<TransactionDraft>(() => TransactionDraftService.createDraft('manual'));
  const [activeMode, setActiveMode] = useState<EntrySource>('manual');
  
  const [amountInput, setAmountInput] = useState('');
  const [merchantInput, setMerchantInput] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState<{ merchant_name: string; category_id: string }[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [budgetImpact, setBudgetImpact] = useState<{ exceedsBudget: boolean; remainingAfter: number, budgetTotal: number } | null>(null);
  
  const [timelineSuggestions, setTimelineSuggestions] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const amountRef = useRef<TextInput>(null);

  // Load Timeline Suggestions
  useEffect(() => {
    const loadData = async () => {
      const suggestions: any[] = [];
      const favs = await MerchantLearningService.getFavorites(3);
      favs.forEach(f => suggestions.push({ ...f, label: 'Favorite', amount_paise: 0 })); // amount 0 means it just sets merchant

      const db = getDb();
      const recRes = await db.execute(`
        SELECT merchant_name, category_id, amount_paise, occurred_at 
        FROM transactions 
        ORDER BY occurred_at DESC LIMIT 5
      `);
      if (recRes?.rows) {
        (recRes.rows as any[]).forEach(r => {
          const isToday = new Date(r.occurred_at).toDateString() === new Date().toDateString();
          suggestions.push({
            merchant_name: r.merchant_name,
            category_id: r.category_id,
            amount_paise: r.amount_paise,
            label: isToday ? 'Today' : 'Earlier',
          });
        });
      }
      setTimelineSuggestions(suggestions);
    };
    if (visible) loadData();
  }, [visible]);

  // Autofocus amount on manual mode
  useEffect(() => {
    if (visible && activeMode === 'manual') {
      setTimeout(() => amountRef.current?.focus(), 400);
    }
  }, [visible, activeMode]);

  // Prediction Engine hook
  useEffect(() => {
    const runPredictions = async () => {
      const numAmount = parseFloat(amountInput) || 0;
      const updatedDraft = {
        ...draft,
        amount_paise: numAmount * 100,
        merchant_name: merchantInput.trim() || undefined,
        source: activeMode
      };
      setDraft(updatedDraft);

      if (numAmount > 0 || updatedDraft.merchant_name) {
        const pred = await TransactionPredictionService.predict(updatedDraft);
        setPrediction(pred);
        const budget = await TransactionPredictionService.evaluateBudgetImpact(updatedDraft);
        setBudgetImpact(budget);
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

  const handleModeChange = async (mode: EntrySource) => {
    setActiveMode(mode);
    setDraft(prev => ({ ...prev, source: mode }));
    
    if (mode === 'scan') {
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
          setIsSaving(true);
          const uri = result.assets[0].uri;
          
          try {
            const scannedDraft = await ReceiptScanService.processReceiptImage(uri);
            setDraft({
              ...scannedDraft,
              source: 'scan'
            });
            // Update fields manually if they are empty so the user sees them in UI
            if (scannedDraft.amount_paise) setAmountInput((scannedDraft.amount_paise / 100).toString());
            if (scannedDraft.merchant_name) setMerchantInput(scannedDraft.merchant_name);
          } catch (e) {
            console.error(e);
            Alert.alert('Scan Failed', 'Could not process the receipt.');
            setActiveMode('manual');
          } finally {
            setIsSaving(false);
          }
        } else {
          // If cancelled, maybe revert to manual
          setActiveMode('manual');
        }
      } catch (err: any) {
        console.error(err);
        Alert.alert('Error', err?.message || 'Could not launch camera.');
        setActiveMode('manual');
      }
    }
  };

  const applySuggestion = (s: any) => {
    if (s.amount_paise) setAmountInput((s.amount_paise / 100).toString());
    setMerchantInput(s.merchant_name);
    setShowAutocomplete(false);
  };

  const applyMerchant = (merchant: string, categoryId?: string) => {
    setMerchantInput(merchant);
    setShowAutocomplete(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    Keyboard.dismiss();
    
    // Finalize Draft
    const finalCategory = prediction?.categoryId || draft.category_id || 'unknown';
    const finalDraft = {
      ...draft,
      amount_paise: (parseFloat(amountInput) || 0) * 100,
      merchant_name: merchantInput.trim() || undefined,
      category_id: finalCategory,
      is_duplicate: prediction?.isDuplicate || false,
      prediction_reason: prediction?.predictionReason || undefined,
    };

    if (finalDraft.merchant_name) {
      await MerchantLearningService.learnCorrection(finalDraft.merchant_name, finalCategory);
      await MerchantLearningService.updateFrequency(finalDraft.merchant_name, finalCategory);
    }

    await EcosystemIntegrationService.notifyDraftSaved(finalDraft);

    setIsSuccess(true);
    setTimeout(() => {
      onSubmit(finalDraft);
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
  };

  const amountIsEmpty = parseFloat(amountInput) === 0 || amountInput === '';
  const merchantIsEmpty = merchantInput.trim().length === 0;
  const isValid = !amountIsEmpty && !merchantIsEmpty;

  const headerContext = `Add Expense • ${new Date().toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`;

  const footer = (
    <StickySaveBar 
      onSave={handleSave} 
      isValid={isValid} 
      isLoading={isSaving} 
      isSuccess={isSuccess}
      budgetImpact={budgetImpact}
      category={prediction?.categoryId || draft.category_id}
      amount={parseFloat(amountInput) || 0}
    />
  );

  return (
    <TransactionEntryShell visible={visible} onClose={onClose} footer={footer} headerContext={headerContext}>
      
      <TransactionEntryModeTabs activeMode={activeMode} onModeChange={handleModeChange} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
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

        {/* TIMELINE SUGGESTIONS (Only when amount is empty) */}
        {activeMode === 'manual' && amountIsEmpty && (
          <TimelineSuggestions suggestions={timelineSuggestions} onSelect={applySuggestion} />
        )}

        {/* STEP 2: MERCHANT */}
        {activeMode === 'manual' && !amountIsEmpty && (
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
                    onPress={() => applyMerchant(res.merchant_name, res.category_id)}
                  >
                    <Text style={[styles.autocompleteText, { color: colors.textPrimary }]}>{res.merchant_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* STEP 3: PREDICTION (AI INSIGHT) */}
        {activeMode === 'manual' && !merchantIsEmpty && prediction?.categoryId && (
          <View style={styles.dynamicContent}>
            <AiAssistantCard 
              predictedCategory={prediction.categoryId}
              confidence={prediction.confidence}
              exceedsBudget={budgetImpact?.exceedsBudget}
              budgetUsagePercent={budgetImpact ? ((budgetImpact.budgetTotal - budgetImpact.remainingAfter) / budgetImpact.budgetTotal) * 100 : undefined}
            />
          </View>
        )}

        {/* SMS / SCAN MODES */}
        {(activeMode === 'sms' || activeMode === 'scan') && (
          <Animated.View layout={Layout.springify()} style={{ marginTop: 24 }}>
            <TransactionPreviewCard draft={draft} mode={activeMode} />
          </Animated.View>
        )}

      </ScrollView>
    </TransactionEntryShell>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 16,
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
});
