import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { useSpecTheme } from '../../theme/specTheme';
import { THEME_TYPOGRAPHY, THEME_SPACING } from '../../theme/blobTheme';
import { TransactionDraft, EntrySource } from '../../types/transactionDraft';
import { TransactionDraftService } from '../../services/TransactionDraftService';
import { IncomeType, IncomeAccount } from '../../types/income';
import * as Icons from 'lucide-react-native';
import { IncomeRuleEngine } from '../../services/income/IncomeRuleEngine';
import { IncomeRoutingEngine, IncomeDistribution } from '../../services/income/IncomeRoutingEngine';
import { getDb } from '../../store/database';
import { StickySaveBar } from '../transaction/StickySaveBar';
import { TransactionEntryShell } from '../transaction/TransactionEntryShell';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (draft: TransactionDraft, distribution: IncomeDistribution[]) => void;
}

export const IncomeTransactionFlow: React.FC<Props> = ({ visible, onClose, onSubmit }) => {
  const { colors, cardRadius } = useSpecTheme();
  const typography = THEME_TYPOGRAPHY;
  const spacing = THEME_SPACING;
  
  const [draft, setDraft] = useState<TransactionDraft>(() => {
    const d = TransactionDraftService.createDraft('manual');
    d.type = 'income';
    return d;
  });

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [amountInput, setAmountInput] = useState('');
  const [selectedType, setSelectedType] = useState<IncomeType>('salary');
  const [sourceName, setSourceName] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [accounts, setAccounts] = useState<IncomeAccount[]>([]);
  const [previewDistribution, setPreviewDistribution] = useState<IncomeDistribution[]>([]);

  // Load Accounts on Mount
  useEffect(() => {
    const loadAccounts = async () => {
      const db = getDb();
      const res = await db.execute('SELECT * FROM income_accounts');
      if (res.rows) {
        setAccounts(res.rows as any as IncomeAccount[]);
      }
    };
    if (visible) loadAccounts();
  }, [visible]);

  const handleGeneratePreview = async () => {
    const amountPaise = (parseFloat(amountInput) || 0) * 100;
    const db = getDb();
    const rules = await IncomeRuleEngine.getRulesForSource(db as any, draft.income_source_id || null);
    
    // Virtual dry run (we mock it by running the exact same evaluation logic without saving)
    let remainingPaise = amountPaise;
    const dist: IncomeDistribution[] = [];

    for (const rule of rules) {
      if (remainingPaise <= 0) break;
      const allocated = IncomeRuleEngine.evaluateRule(rule, amountPaise, remainingPaise);
      if (allocated > 0) {
        dist.push({ destination_type: rule.destination_type, destination_id: rule.destination_id, amount_paise: allocated });
        remainingPaise -= allocated;
      }
    }
    if (remainingPaise > 0) {
      dist.push({ destination_type: 'safe_to_spend', destination_id: null, amount_paise: remainingPaise });
    }

    setPreviewDistribution(dist);
    setStep(4);
  };

  const handleSave = () => {
    const finalDraft: TransactionDraft = {
      ...draft,
      amount_paise: (parseFloat(amountInput) || 0) * 100,
      merchant_name: sourceName,
      income_type: selectedType,
      account_id: selectedAccountId,
      draft_status: 'saving'
    };
    onSubmit(finalDraft, previewDistribution);
  };

  if (!visible) return null;

  return (
    <TransactionEntryShell visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        
        {/* STEP 1: Amount & Type */}
        <Animated.View layout={Layout.springify()} style={styles.stepContainer}>
          <Text style={[typography.h2, { color: colors.textPrimary, marginBottom: spacing.md }]}>How much did you receive?</Text>
          <TextInput
            style={[typography.h1, { color: colors.success, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: spacing.md }]}
            value={amountInput}
            onChangeText={setAmountInput}
            keyboardType="decimal-pad"
            placeholder="₹0"
            placeholderTextColor={colors.textSecondary}
            autoFocus
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg }}>
            {['salary', 'freelance', 'business', 'refund', 'other'].map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setSelectedType(t as IncomeType)}
                style={[
                  styles.chip,
                  { backgroundColor: selectedType === t ? colors.primaryAccent : colors.card },
                  { borderRadius: cardRadius }
                ]}
              >
                <Text style={{ color: selectedType === t ? '#FFF' : colors.textSecondary }}>{t.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* STEP 2: Source */}
        {parseFloat(amountInput) > 0 && (
          <Animated.View entering={FadeIn} layout={Layout.springify()} style={[styles.stepContainer, { marginTop: spacing.xl }]}>
            <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.md }]}>From whom?</Text>
            <TextInput
              style={[typography.body, { color: colors.textPrimary, backgroundColor: colors.card, padding: spacing.md, borderRadius: cardRadius }]}
              value={sourceName}
              onChangeText={setSourceName}
              placeholder="e.g. Acme Corp, Client X..."
              placeholderTextColor={colors.textSecondary}
            />
          </Animated.View>
        )}

        {/* STEP 3: Account */}
        {sourceName.length > 0 && (
          <Animated.View entering={FadeIn} layout={Layout.springify()} style={[styles.stepContainer, { marginTop: spacing.xl }]}>
            <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.md }]}>To which account?</Text>
            <View style={{ gap: spacing.sm }}>
              {accounts.length > 0 ? accounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  onPress={() => setSelectedAccountId(acc.id)}
                  style={[
                    styles.accountCard,
                    { backgroundColor: selectedAccountId === acc.id ? colors.surfaceSunken : colors.card, borderRadius: cardRadius }
                  ]}
                >
                  <Icons.Landmark color={selectedAccountId === acc.id ? colors.primaryAccent : colors.textSecondary} size={20} />
                  <Text style={[typography.body, { color: selectedAccountId === acc.id ? colors.primaryAccent : colors.textPrimary, marginLeft: spacing.md }]}>{acc.name}</Text>
                </TouchableOpacity>
              )) : (
                <Text style={{ color: colors.textSecondary }}>No accounts found. Will route to default.</Text>
              )}
            </View>
          </Animated.View>
        )}

        {/* STEP 4: Preview */}
        {step === 4 && (
          <Animated.View entering={FadeIn} layout={Layout.springify()} style={[styles.stepContainer, { marginTop: spacing.xl, paddingBottom: 100 }]}>
            <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: spacing.md }]}>Income Distribution Preview</Text>
            <View style={{ backgroundColor: colors.card, padding: spacing.lg, borderRadius: cardRadius, gap: spacing.md }}>
              <Text style={[typography.h2, { color: colors.success }]}>₹{amountInput} {selectedType}</Text>
              <Text style={[typography.body, { color: colors.textSecondary }]}>→ {accounts.find(a => a.id === selectedAccountId)?.name || 'Default Account'}</Text>
              
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />
              
              {previewDistribution.map((dist, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[typography.body, { color: colors.textPrimary }]}>→ {dist.destination_type.replace(/_/g, ' ').toUpperCase()}</Text>
                  <Text style={[typography.body, { color: colors.textPrimary, fontWeight: 'bold' }]}>₹{(dist.amount_paise / 100).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

      </ScrollView>

      {/* Save / Preview Bar */}
      {selectedAccountId !== '' && step < 4 && (
        <StickySaveBar 
          onSave={handleGeneratePreview} 
          isValid={true} 
          isLoading={false} 
          customLabel="Preview Routing" 
          customSubLabel="View distribution cascade" 
        />
      )}
      {step === 4 && (
        <StickySaveBar 
          onSave={handleSave} 
          isValid={true} 
          isLoading={false} 
          customLabel="Confirm & Save Income" 
          customSubLabel="Route to goals and bills" 
        />
      )}
    </TransactionEntryShell>
  );
};

const styles = StyleSheet.create({
  stepContainer: {
    width: '100%',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  }
});
