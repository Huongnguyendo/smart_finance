import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { apiJson, getApiUrl } from '../src/lib/api';
import { useUser } from '../src/contexts/UserContext';
import { setItem } from '../src/lib/storage';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { SectionCard } from '../src/components/SectionCard';

type AuthResponse = {
  token: string;
  user: {
    id: number;
    email: string;
    displayName: string | null;
    role?: 'USER' | 'ADMIN';
  };
};

export default function Auth() {
  const router = useRouter();
  const { setUser } = useUser();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');

  async function submit() {
    setStatus('Submitting...');
    try {
      const payload =
        mode === 'login'
          ? { email, password }
          : { email, password, displayName: name };
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const response = await apiJson<AuthResponse>(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await setItem('smartwallet_token', response.token);
      if (response.user) {
        setUser(response.user);
      }
      setStatus('Success!');
      router.replace('/(tabs)/home');
    } catch (error) {
      setStatus(`Failed: ${(error as Error).message || 'Unknown error'}`);
    }
  }

  return (
    <ScreenContainer>
      <SectionCard>
        <Text style={styles.title}>SmartWallet AI</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </Text>

        <View style={styles.toggle}>
          <Pressable
            style={[styles.toggleButton, mode === 'login' && styles.toggleActive]}
            onPress={() => setMode('login')}
            testID="auth-login-toggle"
          >
            <Text style={styles.toggleText}>Login</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, mode === 'signup' && styles.toggleActive]}
            onPress={() => setMode('signup')}
            testID="auth-signup-toggle"
          >
            <Text style={styles.toggleText}>Sign Up</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          {mode === 'signup' && (
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
              testID="auth-name-input"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            testID="auth-email-input"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            testID="auth-password-input"
          />
        </View>

        <Pressable style={styles.primaryButton} onPress={submit} accessibilityRole="button" testID="auth-submit">
          <Text style={styles.primaryButtonText}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Text>
        </Pressable>

        <Text style={styles.helper}>
          API: {getApiUrl()}
        </Text>
        {!!status && <Text style={styles.status} testID="auth-status">{status}</Text>}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 14,
    color: '#cbd5f5',
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    marginTop: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
  },
  toggleText: {
    color: '#e2e8f0',
    fontWeight: '600',
  },
  form: {
    gap: 12,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  helper: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 12,
  },
  status: {
    marginTop: 6,
    color: '#cbd5f5',
    fontSize: 12,
  },
});
