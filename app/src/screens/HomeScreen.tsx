import { useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export function HomeScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Current balance</Text>
        <Text style={styles.heroValue}>$12,480.35</Text>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroLabel}>Income</Text>
            <Text style={styles.heroStat}>$4,320</Text>
          </View>
          <View>
            <Text style={styles.heroLabel}>Expenses</Text>
            <Text style={styles.heroStat}>$2,910</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Insights</Text>
        <Text style={styles.cardBody}>On track to save $420 this month.</Text>
        <Text style={styles.cardBody}>Impulse alert: weekend spend is high.</Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Chat')}
        >
          <Text style={styles.secondaryButtonText}>Ask SmartWallet AI</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gamification</Text>
        <Text style={styles.cardBody}>7-day budget streak 🔥</Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Goals')}
        >
          <Text style={styles.secondaryButtonText}>View goals & badges</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Transactions</Text>
        <Text style={styles.cardBody}>Coffee • $4.50</Text>
        <Text style={styles.cardBody}>Groceries • $86.20</Text>
        <Text style={styles.cardBody}>Streaming • $12.99</Text>
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
  hero: {
    backgroundColor: '#111827',
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  heroLabel: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  heroValue: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '700',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStat: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  cardBody: {
    color: '#cbd5f5',
  },
  secondaryButton: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryButtonText: {
    color: '#e2e8f0',
    fontWeight: '600',
  },
});
