import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { getItem } from '../src/lib/storage';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      const onboarded = await getItem('smartwallet_onboarded');
      const token = await getItem('smartwallet_token');
      if (!mounted) {
        return;
      }
      if (!onboarded) {
        router.replace('/onboarding');
        return;
      }
      if (!token) {
        router.replace('/auth');
        return;
      }
      router.replace('/(tabs)/home');
    }
    const timer = setTimeout(bootstrap, 1200);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SmartWallet AI</Text>
      <Text style={styles.subtitle}>Loading your finances...</Text>
      <ActivityIndicator size="large" color="#4F46E5" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 14,
    color: '#cbd5f5',
  },
});
