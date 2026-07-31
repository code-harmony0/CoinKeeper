import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Text as RNText, TextInput as RNTextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { useSpecTheme } from '../../theme/specTheme';
import { Cloud, Lock, Send, Bot } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const AskAiScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, space, cardRadius, iconShadow, inputRadius, cardShadow } = useSpecTheme();
  
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I am your Premium AI Coach. I can analyze your spending patterns, explain why you overspent this month, or help you plan for a big purchase. What would you like to know?',
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = () => {
    if (!prompt.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: prompt };
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setIsLoading(true);

    // Mock AI response
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Based on your recent transactions, you spent ₹4,200 on food delivery this month. That is 38% higher than last month. Saving just ₹140/day would cover the difference next month!',
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <RNText style={[styles.title, { color: colors.textPrimary }]}>Ask AI</RNText>
      </View>

      <View style={[styles.disclaimer, { backgroundColor: colors.surfaceSunken, borderRadius: cardRadius }]}>
        <View style={styles.disclaimerIcon}>
          <Cloud size={16} color={colors.textSecondary} />
          <Lock size={12} color={colors.textSecondary} style={{ position: 'absolute', bottom: -2, right: -2 }} />
        </View>
        <RNText style={[styles.disclaimerText, { color: colors.textSecondary }]}>
          Privacy Notice: Messages sent here are processed in the cloud to generate insights. 
          Your raw bank details are NEVER shared.
        </RNText>
      </View>

      <ScrollView 
        style={styles.chatArea} 
        contentContainerStyle={[styles.chatContent, { padding: space.md, gap: space.md }]}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <Animated.View 
            key={msg.id} 
            entering={FadeInDown.springify()}
            style={[
              styles.messageBubble,
              { borderRadius: cardRadius, padding: space.md, gap: space.sm },
              msg.role === 'user' 
                ? [styles.userBubble, { backgroundColor: colors.primaryAccent }] 
                : [styles.aiBubble, { backgroundColor: colors.card }, cardShadow]
            ]}
          >
            {msg.role === 'assistant' && (
              <View style={[styles.aiAvatar, { backgroundColor: colors.chipBg }, iconShadow]}>
                <Bot size={16} color={colors.primaryAccent} />
              </View>
            )}
            <RNText 
              style={[
                styles.messageText,
                msg.role === 'user' ? { color: '#FFFFFF' } : { color: colors.textPrimary }
              ]}
            >
              {msg.content}
            </RNText>
          </Animated.View>
        ))}
        {isLoading && (
          <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: colors.card, borderRadius: cardRadius, padding: space.md }, cardShadow]}>
            <RNText style={[styles.messageText, { color: colors.textSecondary }]}>Thinking...</RNText>
          </View>
        )}
      </ScrollView>

      <View style={[
        styles.inputArea, 
        { 
          paddingBottom: Math.max(insets.bottom, space.md), 
          backgroundColor: colors.card,
          padding: space.sm,
          gap: space.sm
        },
        cardShadow
      ]}>
        <RNTextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ask me about your spending..."
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderRadius: inputRadius }]}
          multiline
        />
        <Button
          title=""
          icon={<Send size={20} color="#FFFFFF" />}
          onPress={handleSend}
          disabled={isLoading || !prompt.trim()}
          style={[styles.sendButton, { backgroundColor: colors.primaryAccent }]}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontFamily: 'Satoshi-Black',
    fontSize: 28,
    letterSpacing: -0.3,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    padding: 16,
    gap: 16,
    marginBottom: 16,
  },
  disclaimerIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Satoshi-Medium',
    lineHeight: 18,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    // Dynamic padding set inline
  },
  messageBubble: {
    maxWidth: '85%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Satoshi-Medium',
    lineHeight: 22,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 15,
    fontFamily: 'Satoshi-Medium',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AskAiScreen;
