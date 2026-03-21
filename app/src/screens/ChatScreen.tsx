import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export function ChatScreen() {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.chat} contentContainerStyle={styles.chatContent}>
        <View style={[styles.bubble, styles.bot]}>
          <Text style={styles.bubbleText}>Hi! Ask me about your spending habits.</Text>
        </View>
        <View style={[styles.bubble, styles.user]}>
          <Text style={styles.bubbleText}>How can I reduce dining costs?</Text>
        </View>
        <View style={[styles.bubble, styles.bot]}>
          <Text style={styles.bubbleText}>
            Try meal prepping twice a week and set a dining budget of $120.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask SmartWallet AI..."
          placeholderTextColor="#94a3b8"
        />
        <Pressable style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  chat: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
    gap: 12,
  },
  bubble: {
    padding: 12,
    borderRadius: 14,
    maxWidth: '80%',
  },
  bot: {
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: '#4F46E5',
  },
  bubbleText: {
    color: '#f8fafc',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#0f172a',
  },
  input: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#f8fafc',
  },
  sendButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
