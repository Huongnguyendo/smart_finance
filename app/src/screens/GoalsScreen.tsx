import { ScrollView, StyleSheet, Text, View } from 'react-native';

export function GoalsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Savings Goals</Text>
        <Text style={styles.body}>Vacation Fund • 62%</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '62%' }]} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Streaks</Text>
        <Text style={styles.body}>7-day budget streak 🔥</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Badges</Text>
        <Text style={styles.body}>Budget Hero • Unlocked</Text>
        <Text style={styles.body}>Receipt Master • Locked</Text>
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
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    color: '#cbd5f5',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1f2937',
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: '#10B981',
  },
});
