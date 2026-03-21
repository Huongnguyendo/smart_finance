import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export function ReceiptUploadScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.camera}>
        <Text style={styles.cameraText}>Camera preview (Expo Camera)</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>OCR Results</Text>
        <TextInput style={styles.input} placeholder="Amount" placeholderTextColor="#94a3b8" />
        <TextInput style={styles.input} placeholder="Merchant" placeholderTextColor="#94a3b8" />
        <TextInput style={styles.input} placeholder="Category" placeholderTextColor="#94a3b8" />
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Save Transaction</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
    backgroundColor: '#0f172a',
  },
  camera: {
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraText: {
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  title: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
  },
  primaryButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
