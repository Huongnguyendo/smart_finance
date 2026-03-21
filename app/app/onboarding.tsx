import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { setItem } from '../src/lib/storage';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { SectionCard } from '../src/components/SectionCard';

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

export default function Onboarding() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isWeb = Platform.OS === 'web';

  async function complete() {
    await setItem('smartwallet_onboarded', 'true');
    router.replace('/auth');
  }

  return (
    <ScreenContainer>
      <SectionCard style={styles.card}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
        {isWeb && (
          <Text style={styles.helper}>Use Next/Back buttons to navigate.</Text>
        )}
      </SectionCard>

      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.actions}>
        <View style={styles.actionRow}>
          {index > 0 && (
            <Pressable
              style={styles.ghostButton}
              onPress={() => setIndex((prev) => prev - 1)}
            >
              <Text style={styles.ghostButtonText}>Back</Text>
            </Pressable>
          )}
          {index < slides.length - 1 ? (
            <Pressable
              style={styles.primaryButton}
              onPress={() => setIndex((prev) => prev + 1)}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.primaryButton} onPress={complete}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </Pressable>
          )}
        </View>
        {index < slides.length - 1 && (
          <Pressable style={styles.skipButton} onPress={complete}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
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
  helper: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 12,
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
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
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
    flex: 1,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ghostButtonText: {
    color: '#e2e8f0',
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
  },
  skipText: {
    color: '#cbd5f5',
  },
});
