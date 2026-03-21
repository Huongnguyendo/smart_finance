import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onDone: () => void;
};

const slides = [
  {
    title: 'Welcome to SmartWallet AI',
    body: 'Manage spending with AI-powered insights.',
  },
  {
    title: 'Scan receipts instantly',
    body: 'OCR auto-categorizes your expenses.',
  },
  {
    title: 'Predictions & savings tips',
    body: 'Forecasts and optimization suggestions.',
  },
];

export function OnboardingScreen({ onDone }: Props) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </View>

      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.actions}>
        {index < slides.length - 1 ? (
          <Pressable
            style={styles.primaryButton}
            onPress={() => setIndex((prev) => prev + 1)}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryButton} onPress={onDone}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>
        )}
        {index < slides.length - 1 && (
          <Pressable style={styles.ghostButton} onPress={onDone}>
            <Text style={styles.ghostButtonText}>Skip</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    gap: 24,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    color: '#cbd5f5',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  dotActive: {
    backgroundColor: '#4F46E5',
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  ghostButton: {
    alignItems: 'center',
  },
  ghostButtonText: {
    color: '#cbd5f5',
  },
});
