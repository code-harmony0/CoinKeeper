import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSpecTheme } from '../../theme/specTheme';
import { BrainCircuit, Send, Sparkles } from 'lucide-react-native';
import { PressableScale } from '../../components/anim';
import { InsightEngine, FinancialInsight } from '../../services/InsightEngine';
import { InsightCard } from '../../components/insights/InsightCard';
import { AIProvider } from '../../services/AIProvider';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content?: string;
  structuredData?: any;
}

export const AskAiScreen: React.FC<any> = () => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius, iconShadow } = useSpecTheme();

  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    // Generate (mock) daily insights then fetch
    await InsightEngine.generateDailyInsights();
    const data = await InsightEngine.getCachedInsights();
    setInsights(data);
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
                <InsightCard key={insight.id} insight={insight} index={idx} />
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
