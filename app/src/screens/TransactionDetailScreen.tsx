import { ScrollView, StyleSheet, Text, View } from 'react-native';

export function TransactionDetailScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.receiptPreview}>
        <Text style={styles.receiptText}>Receipt image preview</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>$42.15</Text>
        <Text style={styles.subtitle}>Food • Feb 7, 2026</Text>
        <Text style={styles.body}>Merchant: Smart Cafe</Text>
        <Text style={styles.body}>Notes: Espresso + croissant</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>AI Suggestions</Text>
        <Text style={styles.body}>
          This looks like a recurring coffee spend. Reduce to 3x/week to save $120/year.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  receiptPreview: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptText: {
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    color: '#94a3b8',
  },
  body: {
    color: '#cbd5f5',
  },
});
