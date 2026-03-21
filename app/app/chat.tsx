import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useUser } from '../src/contexts/UserContext';
import { theme } from '../src/theme';
import { apiAuthJson } from '../src/lib/api';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { SectionCard } from '../src/components/SectionCard';

type Message = { role: 'user' | 'bot'; text: string };

export default function Chat() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Hi! Ask me about your spending habits, budgeting, or how to save money.' },
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

  return (
    <ScreenContainer scrollable={false}>
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
              <View key={i} style={[styles.bubble, msg.role === 'user' ? styles.user : styles.bot]}>
                <Text style={styles.bubbleText}>{msg.text}</Text>
              </View>
            ))}
            {loading && (
              <View style={[styles.bubble, styles.bot]}>
                <ActivityIndicator size="small" color={theme.colors.textMuted} />
              </View>
            )}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Ask SmartWallet AI..."
              placeholderTextColor={theme.colors.textMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendMessage}
              editable={!loading}
            />
            <Pressable
              style={[styles.sendButton, loading && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={loading || !input.trim()}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  chatContainer: {
    flex: 1,
    minHeight: 420,
  },
  chatContent: {
    gap: 12,
  },
  bubble: {
    padding: 12,
    borderRadius: 14,
    maxWidth: '80%',
  },
  bot: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.bgElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.accent,
  },
  bubbleText: {
    color: theme.colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.bgInput,
    borderRadius: theme.radii.md,
    paddingHorizontal: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  keyboardView: {
    flex: 1,
  },
});
