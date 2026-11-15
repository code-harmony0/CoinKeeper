import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand, useSpecTheme } from '../../theme/specTheme';
import { ArrowUp, ChevronLeft, Sparkles } from 'lucide-react-native';
import { PressableScale } from '../../components/anim';
import { InsightEngine, FinancialInsight } from '../../services/InsightEngine';
import { InsightCard } from '../../components/insights/InsightCard';
import { AIProvider } from '../../services/AIProvider';
import { LlmModelManager } from '../../services/llm/LlmModelManager';
import { AppDialog, type DialogAction } from '../../components/ui/AppDialog';
import { useBillStore } from '../../store/billStore';
import { useTransactionStore } from '../../store/transactionStore';
import { scheduleBillReminder } from '../../services/notificationService';
import { suggestBills, type BillSuggestion } from '../../services/billSuggestions';
import { Money } from '../../utils/money';
import { findRecurring } from '../../services/spendingAnalysis';

const cadenceLabel = (intervalMonths: number): string => {
  switch (intervalMonths) {
    case 3: return 'Quarterly';
    case 6: return 'Half-yearly';
    case 12: return 'Yearly';
    default: return 'Monthly';
  }
};

/** Questions the answer engine understands, so a first tap always gets a real answer. */
const STARTERS = [
  'How much did I spend?',
  'Where did my money go?',
  'What bills are due soon?',
  'How much came in this month?',
  'How can I improve?',
];

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content?: string;
  structuredData?: any;
}

export const AskAiScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useSpecTheme();

  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string;
    message?: string;
    actions: DialogAction[];
  } | null>(null);
  const [modelReady, setModelReady] = useState(true);
  const [billSuggestions, setBillSuggestions] = useState<BillSuggestion[]>([]);

  useEffect(() => {
    loadDashboard();
    LlmModelManager.getState().then(st => setModelReady(st === 'ready')).catch(() => setModelReady(false));
  }, []);

  const loadDashboard = async () => {
    // Generate (mock) daily insights then fetch
    await InsightEngine.generateDailyInsights();
    const data = await InsightEngine.getCachedInsights();
    setInsights(data);
    setBillSuggestions(await findBillSuggestions());
  };

  const findBillSuggestions = async () => {
    const { bills, loadBills } = useBillStore.getState();
    if (bills.length === 0) await loadBills();
    // Same ledger the insight was built from: money expected back is not a bill.
    const ledger = useTransactionStore
      .getState()
      .transactions.filter(t => !t.awaitingReturn && !t.settlementOf);
    return suggestBills(findRecurring(ledger), useBillStore.getState().bills);
  };

  const addBills = async (suggestions: BillSuggestion[]) => {
    const { addBill, updateNotificationId } = useBillStore.getState();
    for (const s of suggestions) {
      const bill = {
        name: s.name,
        amountPaise: s.amountPaise,
        dueDay: s.dueDay,
        isRecurring: true,
        reminderDaysBefore: 3,
        intervalMonths: s.intervalMonths,
        repeatInterval: cadenceLabel(s.intervalMonths),
        // The reminder schedule anchors a multi-month cycle to this date —
        // without it, a half-yearly bill would look due every month.
        lastPaidAt: new Date(s.lastSeen).getTime(),
      };
      const id = await addBill(bill);
      // Only the new bills: rescheduling every bill would stack a second
      // reminder on the ones that already have one.
      const notificationId = await scheduleBillReminder({ ...bill, id });
      if (notificationId) await updateNotificationId(id, notificationId);
    }
    setBillSuggestions(await findBillSuggestions());
    setDialog({
      title: 'Reminders set',
      message: `${suggestions.length} bill${suggestions.length === 1 ? '' : 's'} will now remind you 3 days before they land.`,
      actions: [{ label: 'Done', cancel: true }],
    });
  };

  // Shown before anything is written: a repeating payment is not always a bill.
  const handleRemindBills = () => {
    const suggestions = billSuggestions;
    setDialog({
      title: `Add ${suggestions.length} bill${suggestions.length === 1 ? '' : 's'}?`,
      message: suggestions
        .map(s => `${s.name} · ${Money.format(s.amountPaise, { zeroDecimals: true })} · ${cadenceLabel(s.intervalMonths).toLowerCase()}, due on day ${s.dueDay}`)
        .join('\n'),
      actions: [
        { label: 'Add these', onPress: () => void addBills(suggestions) },
        { label: 'Cancel', cancel: true },
      ],
    });
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await AIProvider.askQuestion(userMsg.content!);
      const aiMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        structuredData: response.structuredReply 
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <PressableScale
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.backBtn, { backgroundColor: colors.chipBg }]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </PressableScale>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Ask AI</Text>
      </View>

      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
          
          {/* Proactive Insights Dashboard */}
          {messages.length === 0 && (
            <View style={styles.dashboard}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} accessibilityRole="header">Today</Text>
              {insights.map((insight, idx) => (
                insight.actionRoute === 'SuggestBills' ? (
                  // The button appears only when there is a monthly bill to offer;
                  // otherwise the card leads to Bills as before.
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    index={idx}
                    onPress={billSuggestions.length > 0 ? handleRemindBills : () => navigation.navigate('Bills')}
                  >
                    {billSuggestions.length > 0 && (
                      <PressableScale
                        onPress={handleRemindBills}
                        style={[styles.actionBtn, { backgroundColor: brand.signal }]}
                      >
                        <Text style={[styles.actionText, { color: brand.ink }]}>Remind me before each charge</Text>
                      </PressableScale>
                    )}
                  </InsightCard>
                ) : (
                  <InsightCard key={insight.id} insight={insight} index={idx} />
                )
              ))}
            </View>
          )}

          {messages.length === 0 && (
            <View style={styles.dashboard}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} accessibilityRole="header">Try asking</Text>
              <View style={styles.chips}>
                {STARTERS.map(q => (
                  <PressableScale
                    key={q}
                    onPress={() => handleSend(q)}
                    accessibilityRole="button"
                    style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={[styles.chipText, { color: colors.textPrimary }]}>{q}</Text>
                  </PressableScale>
                ))}
              </View>
              {!modelReady && (
                <PressableScale
                  onPress={() => navigation.navigate('SmartParsing')}
                  accessibilityRole="button"
                  style={styles.modelNote}
                >
                  <Text style={[styles.modelNoteText, { color: colors.textSecondary }]}>
                    I match your words to a few topics. Turn on the on-device model to understand more ways of asking.
                  </Text>
                  <Text style={[styles.modelNoteLink, { color: colors.textPrimary }]}>Turn on</Text>
                </PressableScale>
              )}
            </View>
          )}

          {/* Chat History */}
          <View style={styles.chatArea}>
            {messages.map((msg) => (
              <View key={msg.id} style={[
                styles.bubbleWrap, 
                msg.role === 'user' ? styles.bubbleUserWrap : styles.bubbleAiWrap
              ]}>
                {msg.role === 'user' ? (
                  <View style={[styles.bubbleUser, { backgroundColor: isDark ? colors.chipBg : brand.ink }]}>
                    <Text style={[styles.bubbleUserText, { color: '#FFFFFF' }]}>{msg.content}</Text>
                  </View>
                ) : (
                  <View style={[styles.bubbleAi, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.aiHeader}>
                      <Sparkles size={16} color={colors.textPrimary} strokeWidth={1.8} />
                      <Text style={[styles.aiTitle, { color: colors.textPrimary }]}>
                        {msg.structuredData?.title || 'Response'}
                      </Text>
                    </View>
                    <Text style={[styles.aiBody, { color: colors.textPrimary }]}>
                      {msg.structuredData?.body}
                    </Text>
                  </View>
                )}
              </View>
            ))}
            {isLoading && (
              <View style={[styles.bubbleAiWrap, { marginTop: 12 }]}>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium' }}>Analyzing...</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Deep Dive Input */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom || 24 }]}>
          <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Ask anything about your money..."
              placeholderTextColor={colors.textSecondary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => handleSend()}
            />
            <PressableScale
              onPress={() => handleSend()}
              accessibilityRole="button"
              accessibilityLabel="Send"
              style={[styles.sendBtn, { backgroundColor: input.trim() ? brand.ink : colors.border }]}
            >
              <ArrowUp size={20} strokeWidth={2.4} color={input.trim() ? brand.signal : colors.textSecondary} />
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>

      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ''}
        message={dialog?.message}
        actions={dialog?.actions ?? []}
        onClose={() => setDialog(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex1: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, lineHeight: 36, fontFamily: 'Satoshi-Black' },
  scroll: { paddingHorizontal: 24, paddingVertical: 16 },
  dashboard: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, lineHeight: 28, fontFamily: 'Satoshi-Bold', marginBottom: 4 },
  chatArea: { gap: 16 },
  modelNote: { minHeight: 48, marginTop: 16, gap: 4, justifyContent: 'center' },
  modelNoteText: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium' },
  modelNoteLink: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Bold' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  chipText: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Bold' },
  actionBtn: { minHeight: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 14, fontFamily: 'Satoshi-Bold' },
  bubbleWrap: { maxWidth: '85%' },
  bubbleUserWrap: { alignSelf: 'flex-end' },
  bubbleAiWrap: { alignSelf: 'flex-start' },
  bubbleUser: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, borderBottomRightRadius: 6 },
  bubbleUserText: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Medium' },
  bubbleAi: { padding: 16, borderRadius: 20, borderBottomLeftRadius: 6, borderWidth: StyleSheet.hairlineWidth },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  aiTitle: { fontSize: 14, fontFamily: 'Satoshi-Bold' },
  aiBody: { fontSize: 16, fontFamily: 'Satoshi-Medium', lineHeight: 24 },
  inputContainer: { paddingHorizontal: 24, paddingTop: 16 },
  inputBox: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8, height: 56, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, fontSize: 16, fontFamily: 'Satoshi-Medium' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' }
});
