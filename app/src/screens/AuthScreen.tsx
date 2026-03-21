import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  onAuthSuccess: () => void;
};

export function AuthScreen({ onAuthSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SmartWallet AI</Text>
      <Text style={styles.subtitle}>
        {mode === 'login' ? 'Welcome back' : 'Create your account'}
      </Text>

      <View style={styles.toggle}>
        <Pressable
          style={[styles.toggleButton, mode === 'login' && styles.toggleActive]}
          onPress={() => setMode('login')}
        >
          <Text style={styles.toggleText}>Login</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, mode === 'signup' && styles.toggleActive]}
          onPress={() => setMode('signup')}
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
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <Pressable style={styles.primaryButton} onPress={onAuthSuccess}>
        <Text style={styles.primaryButtonText}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </Text>
      </Pressable>

      <Pressable>
        <Text style={styles.linkText}>Forgot password?</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 16,
    color: '#cbd5f5',
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 12,
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
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
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
  linkText: {
    textAlign: 'center',
    color: '#cbd5f5',
  },
});
