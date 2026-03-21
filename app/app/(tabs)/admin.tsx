import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { apiAuthJson } from '../../src/lib/api';
import { theme } from '../../src/theme';
import { useUser } from '../../src/contexts/UserContext';

type AdminOverview = {
  userCount: number;
  transactionCount: number;
  budgetCount: number;
};

export default function Admin() {
  const { user, refreshUser } = useUser();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await refreshUser();
      const data = await apiAuthJson<AdminOverview>('/api/admin/overview');
      setOverview(data);
    } catch (e) {
      setError((e as Error).message);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      load();
    }
  }, [user?.role, load]);

  if (!user || user.role !== 'ADMIN') {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Admin</Text>
      <Text style={styles.subtitle}>Platform overview (JWT + ADMIN role required)</Text>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      )}

      {!loading && error && (
        <View style={styles.card}>
          <Text style={styles.errorLabel}>Could not load overview</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && overview && (
        <View style={styles.grid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{overview.userCount}</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{overview.transactionCount}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{overview.budgetCount}</Text>
            <Text style={styles.statLabel}>Budgets</Text>
          </View>
        </View>
      )}

      <Text style={styles.hint}>
        Promote a user in your database:{' '}
        <Text style={styles.mono}>UPDATE users SET role = &apos;ADMIN&apos; WHERE email = &apos;…&apos;;</Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 24, paddingBottom: 48 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: { fontSize: 15, color: theme.colors.textMuted, marginBottom: 24 },
  center: { paddingVertical: 32, alignItems: 'center' },
  card: {
    backgroundColor: theme.colors.bgElevated,
    borderRadius: theme.radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  errorLabel: { fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
  errorText: { color: theme.colors.textMuted, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flexGrow: 1,
    minWidth: 120,
    backgroundColor: theme.colors.bgElevated,
    borderRadius: theme.radii.md,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  statLabel: { fontSize: 14, color: theme.colors.textMuted, marginTop: 4 },
  hint: {
    marginTop: 32,
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 },
});
