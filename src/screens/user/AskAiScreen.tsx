import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSpecTheme } from '../../theme/specTheme';
import { BrainCircuit, Send, Sparkles } from 'lucide-react-native';
import { PressableScale } from '../../components/anim';
import { InsightEngine, FinancialInsight } from '../../services/InsightEngine';
import { InsightCard } from '../../components/insights/InsightCard';
import { AIProvider } from '../../services/AIProvider';
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

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content?: string;
  structuredData?: any;
}

export const AskAiScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius, iconShadow } = useSpecTheme();

  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string;
    message?: string;
    actions: DialogAction[];
  } | null>(null);
  const [billSuggestions, setBillSuggestions] = useState<BillSuggestion[]>([]);

  useEffect(() => {
    loadDashboard();
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input.trim() };
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
        <View style={styles.headerLeft}>
          <BrainCircuit color={colors.primaryAccent} size={28} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Intelligence</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
          
          {/* Proactive Insights Dashboard */}
          {messages.length === 0 && (
            <View style={styles.dashboard}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Today's Overview</Text>
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
                        style={[styles.actionBtn, { backgroundColor: colors.primaryAccent }]}
                      >
                        <Text style={[styles.actionText, { color: colors.onAccent }]}>Remind me before each charge</Text>
                      </PressableScale>
                    )}
                  </InsightCard>
                ) : (
                  <InsightCard key={insight.id} insight={insight} index={idx} />
                )
              ))}
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
                  <View style={[styles.bubbleUser, { backgroundColor: colors.textPrimary, borderRadius: cardRadius }]}>
                    <Text style={[styles.bubbleUserText, { color: colors.background }]}>{msg.content}</Text>
                  </View>
                ) : (
                  <View style={[styles.bubbleAi, { backgroundColor: colors.chipBg, borderRadius: cardRadius }]}>
                    <View style={styles.aiHeader}>
                      <Sparkles size={16} color={colors.primaryAccent} />
                      <Text style={[styles.aiTitle, { color: colors.primaryAccent }]}>
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
          <View style={[styles.inputBox, { backgroundColor: colors.chipBg, borderRadius: 100 }]}>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Ask anything about your money..."
              placeholderTextColor={colors.textSecondary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
            />
            <PressableScale onPress={handleSend} style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primaryAccent : colors.textSecondary }]}>
              <Send size={16} color="#fff" />
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
  header: { paddingHorizontal: 24, paddingBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 28, fontFamily: 'Satoshi-Black', letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 24, paddingVertical: 16 },
  dashboard: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontFamily: 'Satoshi-Bold', marginBottom: 16 },
  chatArea: { gap: 16 },
  actionBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 100, alignItems: 'center' },
  actionText: { fontSize: 14, fontFamily: 'Satoshi-Bold' },
  bubbleWrap: { maxWidth: '85%' },
  bubbleUserWrap: { alignSelf: 'flex-end' },
  bubbleAiWrap: { alignSelf: 'flex-start' },
  bubbleUser: { paddingHorizontal: 16, paddingVertical: 12 },
  bubbleUserText: { fontSize: 15, fontFamily: 'Satoshi-Medium' },
  bubbleAi: { padding: 16 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  aiTitle: { fontSize: 14, fontFamily: 'Satoshi-Bold' },
  aiBody: { fontSize: 15, fontFamily: 'Satoshi-Medium', lineHeight: 22 },
  inputContainer: { paddingHorizontal: 24, paddingTop: 16 },
  inputBox: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8, height: 56 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Satoshi-Medium' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }
});
