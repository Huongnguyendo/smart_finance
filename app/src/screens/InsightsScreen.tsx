import { useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export function InsightsScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Forecast</Text>
        <Text style={styles.body}>Projected spend next 30 days: $2,650</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Behavioral Insights</Text>
        <Text style={styles.body}>You spend 40% more on weekends.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Optimizations</Text>
        <Text style={styles.body}>Cancel unused subscription to save $84/year.</Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Chat')}
        >
          <Text style={styles.secondaryButtonText}>Ask AI for tips</Text>
        </Pressable>
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
  card: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  title: {
    color: '#f8fafc',
    fontWeight: '600',
    fontSize: 16,
  },
  body: {
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
  },
});
