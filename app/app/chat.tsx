import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useUser } from '../src/contexts/UserContext';
import { theme } from '../src/theme';
import { apiAuthJson } from '../src/lib/api';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { SectionCard } from '../src/components/SectionCard';

type Message = { role: 'user' | 'bot'; text: string };

const SUGGESTED_PROMPTS = [
  'What changed in my spending this month?',
  'Where can I save $100?',
  'Am I overspending on subscriptions?',
  'What should I watch this week?',
];

export default function Chat() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'I can read your recent transactions and turn them into budgeting advice. Ask me what changed, where to save, or what to watch next.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);
    try {
      const res = await apiAuthJson<{ text: string }>('/api/insights/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, userId: user?.id ?? null }),
      });
      setMessages((prev) => [...prev, { role: 'bot', text: res.text }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: `Failed to get response: ${(e as Error).message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function usePrompt(text: string) {
    if (loading) return;
    setInput(text);
  }

  return (
    <ScreenContainer scrollable={false}>
      <View style={styles.shell}>
        <View style={styles.hero}>
          <View>
            <Text style={styles.eyebrow}>SmartWallet AI</Text>
            <Text style={styles.title}>Money coach</Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Connected</Text>
          </View>
        </View>

        <View style={styles.promptRow}>
          {SUGGESTED_PROMPTS.map((prompt) => (
            <Pressable key={prompt} style={styles.promptChip} onPress={() => usePrompt(prompt)}>
              <Text style={styles.promptText}>{prompt}</Text>
            </Pressable>
          ))}
        </View>

        <SectionCard style={styles.chatContainer}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={100}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((msg, i) => (
              <View key={i} style={[styles.messageRow, msg.role === 'user' && styles.messageRowUser]}>
                {msg.role === 'bot' && (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>AI</Text>
                  </View>
                )}
                <View style={[styles.bubble, msg.role === 'user' ? styles.user : styles.bot]}>
                  <Text style={[styles.bubbleText, msg.role === 'user' && styles.userBubbleText]}>
                    {msg.text}
                  </Text>
                </View>
              </View>
            ))}
            {loading && (
              <View style={styles.messageRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>AI</Text>
                </View>
                <View style={[styles.bubble, styles.bot, styles.typingBubble]}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                  <Text style={styles.typingText}>Thinking through your spending...</Text>
                </View>
              </View>
            )}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Ask about your budget, habits, or next move..."
              placeholderTextColor={theme.colors.textMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendMessage}
              editable={!loading}
              multiline
            />
            <Pressable
              style={[styles.sendButton, loading && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={loading || !input.trim()}
            >
              <Text style={styles.sendButtonText}>↑</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
        </SectionCard>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    gap: 14,
  },
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
  },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    backgroundColor: theme.colors.accentMuted,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.positive,
  },
  statusText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  promptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  promptChip: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgCard,
  },
  promptText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
    minHeight: 520,
    padding: 0,
    overflow: 'hidden',
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  chatContent: {
    gap: 16,
    padding: 20,
    paddingBottom: 28,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentMuted,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.28)',
  },
  avatarText: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  bubble: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: theme.radii.md,
    maxWidth: '76%',
  },
  bot: {
    backgroundColor: theme.colors.bgElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  user: {
    backgroundColor: theme.colors.accent,
  },
  bubbleText: {
    color: theme.colors.text,
    lineHeight: 21,
    fontSize: 14,
  },
  userBubbleText: {
    color: '#fff',
    fontWeight: '600',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typingText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.bgInput,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radii.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: theme.colors.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 22,
    lineHeight: 24,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  keyboardView: {
    flex: 1,
  },
});
