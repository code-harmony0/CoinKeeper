import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/Text';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radii } from '../../theme/designTokens';
import { Cloud, Lock, Send, Bot } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const AskAiScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
      <View style={[styles.header, { paddingTop: insets.top + spacing.m }]}>
        <Text variant="h1" style={styles.title}>Ask AI</Text>
      </View>

      <View style={[styles.disclaimer, { backgroundColor: colors.surfaceSecondary }]}>
        <View style={styles.disclaimerIcon}>
          <Cloud size={16} color={colors.textSecondary} />
          <Lock size={12} color={colors.textSecondary} style={{ position: 'absolute', bottom: -2, right: -2 }} />
        </View>
        <Text variant="caption" color="secondary" style={styles.disclaimerText}>
          Privacy Notice: Messages sent here are processed in the cloud to generate insights. 
          Your raw bank details are NEVER shared.
        </Text>
      </View>

      <ScrollView 
        style={styles.chatArea} 
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <Animated.View 
            key={msg.id} 
            entering={FadeInDown.springify()}
            style={[
              styles.messageBubble,
              msg.role === 'user' ? [styles.userBubble, { backgroundColor: colors.primary }] : [styles.aiBubble, { backgroundColor: colors.card }]
            ]}
          >
            {msg.role === 'assistant' && (
              <View style={[styles.aiAvatar, { backgroundColor: colors.surfaceSecondary }]}>
                <Bot size={16} color={colors.primary} />
              </View>
            )}
            <Text 
              variant="body" 
              style={[
                styles.messageText,
                msg.role === 'user' ? { color: '#FFFFFF' } : { color: colors.text }
              ]}
            >
              {msg.content}
            </Text>
          </Animated.View>
        ))}
        {isLoading && (
          <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: colors.card }]}>
            <Text variant="caption" color="secondary">Thinking...</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, spacing.m), backgroundColor: colors.card }]}>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ask me about your spending..."
          style={styles.input}
          multiline
        />
        <Button
          title=""
          icon={<Send size={20} color="#FFFFFF" />}
          onPress={handleSend}
          disabled={isLoading || !prompt.trim()}
          style={styles.sendButton}
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
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.s,
  },
  title: {
    fontFamily: 'Satoshi-Black',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.m,
    padding: spacing.s,
    borderRadius: radii.card,
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  disclaimerIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disclaimerText: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: spacing.m,
    gap: spacing.m,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: spacing.m,
    borderRadius: radii.card,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
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
    lineHeight: 22,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.s,
    gap: spacing.s,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 48,
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
