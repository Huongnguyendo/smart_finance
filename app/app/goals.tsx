import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../src/components/ScreenContainer';
import { SectionCard } from '../src/components/SectionCard';

export default function Goals() {
  return (
    <ScreenContainer>
      <SectionCard>
        <Text style={styles.title}>Savings Goals</Text>
        <Text style={styles.body}>Vacation Fund • 62%</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '62%' }]} />
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={styles.title}>Streaks</Text>
        <Text style={styles.body}>7-day budget streak 🔥</Text>
      </SectionCard>

      <SectionCard>
        <Text style={styles.title}>Badges</Text>
        <Text style={styles.body}>Budget Hero • Unlocked</Text>
        <Text style={styles.body}>Receipt Master • Locked</Text>
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    marginTop: 8,
  },
  progressFill: {
    height: 8,
    backgroundColor: '#10B981',
  },
});
