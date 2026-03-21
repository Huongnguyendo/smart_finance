import { useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const mockTransactions = [
  { id: '1', title: 'Coffee', amount: '-$4.50', date: 'Today' },
  { id: '2', title: 'Groceries', amount: '-$86.20', date: 'Yesterday' },
  { id: '3', title: 'Salary', amount: '+$2,800', date: 'Feb 1' },
];

export function TransactionsScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextInput
        style={styles.input}
        placeholder="Search transactions"
        placeholderTextColor="#94a3b8"
      />
      <View style={styles.filters}>
        <Text style={styles.filterChip}>Date</Text>
        <Text style={styles.filterChip}>Category</Text>
        <Text style={styles.filterChip}>Amount</Text>
      </View>

      {mockTransactions.map((tx) => (
        <Pressable
          key={tx.id}
          style={styles.card}
          onPress={() => navigation.navigate('TransactionDetail', { id: tx.id })}
        >
          <View>
            <Text style={styles.title}>{tx.title}</Text>
            <Text style={styles.subtitle}>{tx.date}</Text>
          </View>
          <Text style={styles.amount}>{tx.amount}</Text>
        </Pressable>
      ))}
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
    gap: 12,
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#1f2937',
    color: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
  },
  amount: {
    color: '#f8fafc',
    fontWeight: '600',
  },
});
