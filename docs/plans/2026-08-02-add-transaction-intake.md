# Add Transaction Intake Experience Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the existing 4-tab `AddTransactionSheet` (Manual/Scan/SMS/dead-Recent)
into a fully wired 3-mode premium intake experience (Manual/SMS/Scan) with a
unified prediction UI and a real embedded SMS inbox, per
`docs/plans/2026-08-02-add-transaction-intake-design.md`.

**Architecture:** Keep `TransactionEntryShell` / `TransactionEntryModeTabs` /
`StickySaveBar` as the shell. Add `PredictionBanner` (replaces `AiAssistantCard`,
used in all 3 modes) and `SmartSuggestionsSection` (replaces `TimelineSuggestions`,
composed of `QuickAmountRow` + `RecentMerchantRow` + favorites). Embed the real
SMS pipeline (`smsParserService` + `SmsInboxRow`) directly in the sheet's SMS tab.
Show `ReceiptPreviewCard` in scan mode. All four intelligence services
(`TransactionDraftService`, `MerchantLearningService`, `TransactionPredictionService`,
`ReceiptScanService`) are unchanged — this is a UI wiring/consolidation pass.

**Tech Stack:** React Native, TypeScript, `react-native-reanimated`, `lucide-react-native`,
`specTheme` design tokens.

**No new automated tests are needed** — this plan touches no service/business logic
(all four intelligence services stay untouched). Existing service tests
(`TransactionPredictionService.test.ts`, `MerchantLearningService.test.ts`) must
still pass unmodified. Verification is a manual simulator pass (final task).

---

### Task 1: `PredictionBanner` — unify manual + SMS/scan prediction UI

**Files:**
- Create: `src/components/transaction/PredictionBanner.tsx`

**Step 1: Write the component**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, Layout } from 'react-native-reanimated';
import { useSpecTheme } from '../../theme/specTheme';
import { Sparkles, CheckCircle2, ShieldAlert, AlertTriangle, Repeat } from 'lucide-react-native';

interface Props {
  category?: string | null;
  confidence?: number;
  exceedsBudget?: boolean;
  budgetUsagePercent?: number;
  isDuplicate?: boolean;
  isRecurring?: boolean;
  /** manual: category + budget only. inbox: adds confidence/duplicate/recurring badges (SMS/scan). */
  variant: 'manual' | 'inbox';
}

export const PredictionBanner: React.FC<Props> = ({
  category,
  confidence = 0,
  exceedsBudget,
  budgetUsagePercent,
  isDuplicate,
  isRecurring,
  variant,
}) => {
  const { colors, cardRadius } = useSpecTheme();
  const warning = (colors as any).warning || '#F59E0B';

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(20).stiffness(200)}
      exiting={FadeOutUp.duration(200)}
      layout={Layout.springify()}
      style={[styles.container, { backgroundColor: colors.surfaceElevated, borderRadius: cardRadius, borderColor: colors.border, borderWidth: 1 }]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Sparkles size={16} color={colors.primaryAccent} />
          <Text style={[styles.title, { color: colors.primaryAccent }]}>
            {variant === 'manual' ? 'AI Assistant' : 'Confidence'}
          </Text>
        </View>
        {variant === 'inbox' && (
          <Text style={[styles.confidence, { color: confidence >= 80 ? colors.success : warning }]}>
            {confidence}%
          </Text>
        )}
      </View>

      <View style={styles.body}>
        {category && (
          <Text style={[styles.predictionText, { color: colors.textPrimary }]}>
            Looks like <Text style={{ color: colors.primaryAccent }}>{category}</Text>
          </Text>
        )}

        {budgetUsagePercent !== undefined && (
          <>
            <View style={styles.budgetRow}>
              {exceedsBudget ? (
                <ShieldAlert size={16} color={warning} />
              ) : (
                <CheckCircle2 size={16} color={colors.success} />
              )}
              <Text style={[styles.budgetText, { color: exceedsBudget ? warning : colors.success }]}>
                {exceedsBudget ? 'Exceeds monthly budget' : 'Within Budget'}
              </Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: colors.chipBg }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { backgroundColor: exceedsBudget ? warning : colors.success, width: `${Math.min(budgetUsagePercent, 100)}%` },
                ]}
              />
            </View>
          </>
        )}

        {(isDuplicate || isRecurring) && (
          <View style={styles.badgeRow}>
            {isDuplicate && (
              <View style={[styles.badge, { backgroundColor: colors.danger + '20' }]}>
                <AlertTriangle size={12} color={colors.danger} />
                <Text style={[styles.badgeText, { color: colors.danger }]}>Possible duplicate</Text>
              </View>
            )}
            {isRecurring && (
              <View style={[styles.badge, { backgroundColor: colors.primaryAccent + '20' }]}>
                <Repeat size={12} color={colors.primaryAccent} />
                <Text style={[styles.badgeText, { color: colors.primaryAccent }]}>Looks recurring</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, marginVertical: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: 'Satoshi-Bold', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  confidence: { fontFamily: 'Satoshi-Bold', fontSize: 13 },
  body: { gap: 8 },
  predictionText: { fontFamily: 'Satoshi-Black', fontSize: 18 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  budgetText: { fontFamily: 'Satoshi-Bold', fontSize: 14 },
  progressBarBg: { height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  badgeText: { fontFamily: 'Satoshi-Bold', fontSize: 12 },
});
```

**Step 2: Commit**

```bash
git add src/components/transaction/PredictionBanner.tsx
git commit -m "feat: add PredictionBanner to unify manual/SMS/scan prediction UI"
```

---

### Task 2: `QuickAmountRow` and `RecentMerchantRow`

**Files:**
- Create: `src/components/transaction/QuickAmountRow.tsx`
- Create: `src/components/transaction/RecentMerchantRow.tsx`

**Step 1: `QuickAmountRow.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';

interface Props {
  amounts: number[]; // paise, deduped, most-recent-first, max 4
  onSelect: (amountPaise: number) => void;
}

export const QuickAmountRow: React.FC<Props> = ({ amounts, onSelect }) => {
  const { colors, cardRadius } = useSpecTheme();
  if (amounts.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {amounts.slice(0, 4).map((paise, i) => (
        <PressableScale
          key={i}
          onPress={() => onSelect(paise)}
          style={[styles.chip, { backgroundColor: colors.chipBg, borderRadius: cardRadius - 4 }]}
        >
          <Text style={[styles.chipText, { color: colors.textPrimary }]}>
            ₹{(paise / 100).toLocaleString()}
          </Text>
        </PressableScale>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { gap: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 10 },
  chipText: { fontFamily: 'Satoshi-Bold', fontSize: 15 },
});
```

**Step 2: `RecentMerchantRow.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';

interface MerchantItem {
  merchant_name: string;
  category_id: string;
}

interface Props {
  title: string;
  items: MerchantItem[];
  onSelect: (item: MerchantItem) => void;
}

export const RecentMerchantRow: React.FC<Props> = ({ title, items, onSelect }) => {
  const { colors, cardRadius } = useSpecTheme();
  if (items.length === 0) return null;

  return (
    <View style={styles.group}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View style={styles.list}>
        {items.map((item, i) => (
          <PressableScale
            key={i}
            onPress={() => onSelect(item)}
            style={[styles.itemCard, { backgroundColor: colors.chipBg, borderRadius: cardRadius }]}
          >
            <Text style={[styles.merchantText, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.merchant_name}
            </Text>
          </PressableScale>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  group: { marginBottom: 16 },
  sectionTitle: { fontFamily: 'Satoshi-Bold', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  list: { gap: 8 },
  itemCard: { padding: 16 },
  merchantText: { fontFamily: 'Satoshi-Bold', fontSize: 16 },
});
```

**Step 3: Commit**

```bash
git add src/components/transaction/QuickAmountRow.tsx src/components/transaction/RecentMerchantRow.tsx
git commit -m "feat: add QuickAmountRow and RecentMerchantRow building blocks"
```

---

### Task 3: `SmartSuggestionsSection` (replaces `TimelineSuggestions`)

**Files:**
- Create: `src/components/transaction/SmartSuggestionsSection.tsx`

**Step 1: Write the component**

Composes favorites + quick amounts + recents into one adaptive section, shown
in Manual mode when the amount field is empty.

```tsx
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, Layout } from 'react-native-reanimated';
import { RecentMerchantRow } from './RecentMerchantRow';
import { QuickAmountRow } from './QuickAmountRow';

interface MerchantItem {
  merchant_name: string;
  category_id: string;
}

interface Props {
  favorites: MerchantItem[];
  recents: MerchantItem[];
  quickAmounts: number[]; // paise
  onSelectMerchant: (item: MerchantItem) => void;
  onSelectAmount: (amountPaise: number) => void;
}

export const SmartSuggestionsSection: React.FC<Props> = ({
  favorites,
  recents,
  quickAmounts,
  onSelectMerchant,
  onSelectAmount,
}) => {
  const hasAny = favorites.length > 0 || recents.length > 0 || quickAmounts.length > 0;
  if (!hasAny) return null;

  return (
    <Animated.View entering={FadeInDown.duration(400)} exiting={FadeOutUp.duration(300)} layout={Layout.springify()} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {quickAmounts.length > 0 && (
          <View style={styles.block}>
            <QuickAmountRow amounts={quickAmounts} onSelect={onSelectAmount} />
          </View>
        )}
        <RecentMerchantRow title="Favorites" items={favorites} onSelect={onSelectMerchant} />
        <RecentMerchantRow title="Recent" items={recents} onSelect={onSelectMerchant} />
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, marginTop: 16 },
  scroll: { paddingBottom: 40 },
  block: { marginBottom: 20 },
});
```

**Step 2: Commit**

```bash
git add src/components/transaction/SmartSuggestionsSection.tsx
git commit -m "feat: add SmartSuggestionsSection combining favorites/recents/quick amounts"
```

---

### Task 4: Drop the dead 4th tab

**Files:**
- Modify: `src/components/transaction/TransactionEntryModeTabs.tsx:16-21`

**Step 1: Edit the `TABS` array**

Change:
```tsx
  const TABS = [
    { id: 'manual', label: 'Type', Icon: Plus },
    { id: 'scan', label: 'Scan', Icon: Camera },
    { id: 'sms', label: 'SMS', Icon: MessageSquare },
    { id: 'recent', label: 'Recent', Icon: Clock },
  ] as const;
```
to:
```tsx
  const TABS = [
    { id: 'manual', label: 'Type', Icon: Plus },
    { id: 'sms', label: 'SMS', Icon: MessageSquare },
    { id: 'scan', label: 'Scan', Icon: Camera },
  ] as const;
```

Also remove the now-unused `Clock` import on line 6:
```tsx
import { Plus, Camera, MessageSquare, Clock } from 'lucide-react-native';
```
→
```tsx
import { Plus, Camera, MessageSquare } from 'lucide-react-native';
```

**Step 2: Commit**

```bash
git add src/components/transaction/TransactionEntryModeTabs.tsx
git commit -m "fix: drop dead Recent tab, reorder SMS before Scan"
```

---

### Task 5: Simplify `TransactionPreviewCard` (drop duplicate confidence footer)

**Files:**
- Modify: `src/components/transaction/TransactionPreviewCard.tsx`

`PredictionBanner` (Task 1) now owns the confidence/duplicate footer for SMS/scan.
Remove that responsibility here so it isn't shown twice.

**Step 1: Delete the footer block (lines 81-101)**

Remove:
```tsx
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.confidenceRow}>
          {confidence >= 80 ? (
            <CheckCircle2 size={16} color={colors.success} />
          ) : (
            <AlertTriangle size={16} color={(colors as any).warning || '#F59E0B'} />
          )}
          <Text style={[
            styles.confidenceText, 
            { color: confidence >= 80 ? colors.success : ((colors as any).warning || '#F59E0B') }
          ]}>
            {confidence}% Confidence
          </Text>
        </View>
        
        {draft.is_duplicate && (
          <View style={[styles.badge, { backgroundColor: colors.danger + '20' }]}>
            <Text style={[styles.badgeText, { color: colors.danger }]}>Duplicate Risk</Text>
          </View>
        )}
      </View>
```

Also remove the now-unused `confidence` local (line 15) and the `CheckCircle2`,
`AlertTriangle` imports (line 5, keep `MessageSquare`, `Camera`), and the
`footer`/`confidenceRow`/`confidenceText`/`badge`/`badgeText` style entries
(lines 177-203) since nothing references them anymore.

**Step 2: Commit**

```bash
git add src/components/transaction/TransactionPreviewCard.tsx
git commit -m "refactor: remove duplicate confidence footer from TransactionPreviewCard"
```

---

### Task 6: Add recurring-candidate label to `StickySaveBar`

**Files:**
- Modify: `src/components/transaction/StickySaveBar.tsx`

**Step 1: Add `isRecurring` prop and label branch**

Add to `Props` interface (after `budgetImpact`):
```tsx
  isRecurring?: boolean;
```

Add to the destructured props and insert a branch after the `budgetImpact?.exceedsBudget` block (around line 42):
```tsx
  if (isRecurring && !budgetImpact?.exceedsBudget) {
    subLabel = 'Looks Recurring';
  }
```

**Step 2: Commit**

```bash
git add src/components/transaction/StickySaveBar.tsx
git commit -m "feat: surface recurring-candidate status in StickySaveBar"
```

---

### Task 7: Delete superseded components

**Files:**
- Delete: `src/components/transaction/AiAssistantCard.tsx`
- Delete: `src/components/transaction/TimelineSuggestions.tsx`

**Step 1: Confirm no remaining references**

```bash
grep -rn "AiAssistantCard\|TimelineSuggestions" src --include="*.tsx" --include="*.ts"
```
Expected: no matches once Task 8 (below) has removed the imports from
`AddTransactionSheet.tsx`. Run this check *after* Task 8, not before — do
Task 7's deletion as the last step, once Task 8 is committed.

**Step 2: Delete and commit**

```bash
git rm src/components/transaction/AiAssistantCard.tsx src/components/transaction/TimelineSuggestions.tsx
git commit -m "chore: remove AiAssistantCard/TimelineSuggestions, superseded by PredictionBanner/SmartSuggestionsSection"
```

---

### Task 8: Rewrite `AddTransactionSheet.tsx`

**Files:**
- Modify: `src/components/modals/AddTransactionSheet.tsx` (full rewrite)

This is the integration task: wires `SmartSuggestionsSection` into Manual mode,
embeds a live SMS inbox into SMS mode using `smsParserService`, shows
`ReceiptPreviewCard` in Scan mode, and uses `PredictionBanner` everywhere
instead of `AiAssistantCard`/the old `TransactionPreviewCard` footer.

**Step 1: Replace the full file contents**

```tsx
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
import { EcosystemIntegrationService } from '../../services/EcosystemIntegrationService';
import { ReceiptScanService } from '../../services/ReceiptScanService';
import { fetchRecentSms, parseSmsToDraft, SmsMessage } from '../../services/smsParserService';
import { EntrySource, TransactionDraft } from '../../types/transactionDraft';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Animated, { FadeInUp, FadeOutUp, Layout } from 'react-native-reanimated';

// UI Components
import { TransactionEntryShell } from '../transaction/TransactionEntryShell';
import { TransactionEntryModeTabs } from '../transaction/TransactionEntryModeTabs';
import { PredictionBanner } from '../transaction/PredictionBanner';
import { SmartSuggestionsSection } from '../transaction/SmartSuggestionsSection';
import { TransactionPreviewCard } from '../transaction/TransactionPreviewCard';
import { ReceiptPreviewCard } from '../transaction/ReceiptPreviewCard';
import { SmsInboxRow } from '../transaction/SmsInboxRow';
import { StickySaveBar } from '../transaction/StickySaveBar';

const SMS_INBOX_LIMIT = 5;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (draft: TransactionDraft) => void;
}

interface MerchantItem {
  merchant_name: string;
  category_id: string;
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
      const res = await db.execute(
        `SELECT DISTINCT amount FROM transactions ORDER BY date DESC LIMIT 4`
      );
      if (res?.rows) {
        setQuickAmounts((res.rows as any[]).map(r => Math.round(r.amount * 100)));
      }
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

  const loadSmsInbox = useCallback(async () => {
    setSmsLoading(true);
    setSmsError(null);
    try {
      const messages: SmsMessage[] = await fetchRecentSms(SMS_INBOX_LIMIT);
      const parsed: TransactionDraft[] = [];
      for (const m of messages) {
        const result = await parseSmsToDraft(m);
        if (result) parsed.push(result);
      }
      setSmsDrafts(parsed);
    } catch (e) {
      setSmsError('Could not read SMS inbox.');
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
          } catch (e) {
            console.error(e);
            Alert.alert('Scan Failed', 'Could not process the receipt.');
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

    const finalCategory = prediction?.categoryId || draft.category_id || 'unknown';
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
    setActiveMode('manual');
    setSmsDrafts([]);
    setSelectedSmsId(null);
    setReceiptImageUri(undefined);
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
      isRecurring={prediction?.isRecurring}
      category={prediction?.categoryId || draft.category_id}
      amount={parseFloat(amountInput) || 0}
    />
  );

  return (
    <TransactionEntryShell visible={visible} onClose={onClose} footer={footer} headerContext={headerContext}>

      <TransactionEntryModeTabs activeMode={activeMode} onModeChange={handleModeChange} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

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

            {!merchantIsEmpty && prediction?.categoryId && (
              <View style={styles.dynamicContent}>
                <PredictionBanner
                  variant="manual"
                  category={prediction.categoryId}
                  exceedsBudget={budgetImpact?.exceedsBudget}
                  budgetUsagePercent={budgetImpact ? ((budgetImpact.budgetTotal - budgetImpact.remainingAfter) / budgetImpact.budgetTotal) * 100 : undefined}
                  isDuplicate={prediction.isDuplicate}
                  isRecurring={prediction.isRecurring}
                />
              </View>
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
                  category={draft.category_id}
                  confidence={draft.confidence}
                  isDuplicate={draft.is_duplicate}
                  isRecurring={draft.is_recurring_candidate}
                />
              </>
            )}
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
```

Notes on what changed vs. the old file:
- `quick_template`/`favorite`/`recent` `EntrySource` tab paths are gone; only
  `manual` / `sms` / `scan` render content now (matches Task 4's tab list).
- SMS mode now does real work: `loadSmsInbox()` fetches + parses up to 5
  messages via the existing `smsParserService`, renders them with the existing
  `SmsInboxRow` (swipe approve/reject), and tapping approve hydrates the shared
  `draft` the same way manual typing does, then shows `TransactionPreviewCard`
  + `PredictionBanner` + the normal `StickySaveBar` for final edit/save.
- Scan mode now shows `ReceiptPreviewCard` with the actual captured image and
  a scanning spinner, before/alongside the extracted-fields preview.
- `resetState()` now also resets mode/SMS/receipt state so re-opening the sheet
  after a save starts clean, while switching *between* tabs mid-entry (the
  actual "state must survive mode switching" requirement) no longer clears
  anything, since none of the mode-specific state is touched by
  `handleModeChange` except the SMS-load-on-first-visit and camera-launch
  side effects.

**Step 2: Typecheck**

Run: `npx tsc --noEmit -p .` (or the project's existing typecheck script if
one exists in `package.json` — check first with `cat package.json | grep -A2 '"scripts"'`)

Expected: no new errors introduced by this file (pre-existing unrelated errors,
if any, are out of scope).

**Step 3: Commit**

```bash
git add src/components/modals/AddTransactionSheet.tsx
git commit -m "feat: wire SMS inbox and receipt preview into AddTransactionSheet, unify prediction UI"
```

---

### Task 9: Remove dead code confirmed unreferenced (Task 7 cleanup)

**Files:** none new — this is the deferred second half of Task 7.

**Step 1: Re-run the grep from Task 7**

```bash
grep -rn "AiAssistantCard\|TimelineSuggestions" src --include="*.tsx" --include="*.ts"
```
Expected: no matches (Task 8 removed the only imports).

**Step 2: Delete + commit (if not already done)**

```bash
git rm -f src/components/transaction/AiAssistantCard.tsx src/components/transaction/TimelineSuggestions.tsx 2>/dev/null || true
git status
git commit -m "chore: remove AiAssistantCard/TimelineSuggestions, superseded by PredictionBanner/SmartSuggestionsSection" --allow-empty-message -m "cleanup" 2>/dev/null || true
```
(If Task 7 already committed this, `git status` will show nothing to commit —
that's fine, skip the commit.)

---

### Task 10: Manual simulator verification

**Files:** none — verification only, per this plan's "no new automated tests"
note in the header.

**Step 1: Launch the app**

Use the project's `run` skill or `npx react-native run-ios` /
`run-android` per `CoinKeeper/CLAUDE.md`.

**Step 2: Walk through each state and confirm:**

- Manual mode: amount empty → `SmartSuggestionsSection` shows (or nothing, if
  no history yet — must not crash on empty arrays). Typing an amount reveals
  merchant field; typing a known merchant reveals `PredictionBanner` with
  category + budget.
- SMS mode: on a device/simulator without SMS access, confirm the empty/error
  state renders (not a crash) — this is the "empty SMS data" case from the
  product rule. If `SmsModule` is unavailable, `fetchRecentSms` already
  returns `[]` (see `smsParserService.ts:30-36`), so this should render the
  "No transaction-like messages found" empty state.
- Scan mode: camera capture (or simulator photo-library fallback) shows
  `ReceiptPreviewCard` with the image, then the extracted preview once
  scanning finishes.
- Mode switching mid-entry: type an amount in Manual, switch to Scan and back
  — amount must still be there.
- Save: `StickySaveBar` reflects budget/recurring/duplicate state correctly
  in each mode; success animation plays; sheet resets and closes.

**Step 3: Report findings**

If anything breaks, fix it in the relevant task's file before considering the
plan complete — do not defer UI bugs found here.
