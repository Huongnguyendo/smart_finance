import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export function AddScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Transaction</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Amount</Text>
        <TextInput style={styles.input} placeholder="$0.00" placeholderTextColor="#94a3b8" />

        <Text style={styles.label}>Category</Text>
        <TextInput style={styles.input} placeholder="Food, Transport..." placeholderTextColor="#94a3b8" />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Optional notes"
          placeholderTextColor="#94a3b8"
          multiline
        />

        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate('ReceiptUpload')}
        >
          <Text style={styles.primaryButtonText}>Open Camera / Receipt OCR</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Save Transaction</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#e2e8f0',
    fontWeight: '600',
  },
});
