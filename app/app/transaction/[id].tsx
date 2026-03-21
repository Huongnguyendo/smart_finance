import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { apiAuth, apiAuthJson, getApiUrl } from '../../src/lib/api';
import { confirmDelete } from '../../src/lib/confirm';
import { AuthImage } from '../../src/components/AuthImage';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SectionCard } from '../../src/components/SectionCard';

type Transaction = {
  id: number;
  userId: number;
  amount: number;
  description: string | null;
  category: string | null;
  date: string;
  receiptUrl: string | null;
  createdAt?: string;
  updatedAt?: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWebWide = Platform.OS === 'web' && width >= 768;
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchAiSuggestions = async () => {
    if (!transaction) return;
    setAiLoading(true);
    setAiSuggestions(null);
    try {
      const res = await apiAuthJson<{ text: string }>('/api/insights/transaction-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: transaction.description || 'Transaction',
          amount: Math.abs(transaction.amount),
          category: transaction.category,
        }),
      });
      setAiSuggestions(res.text);
    } catch (e) {
      setAiSuggestions(`Failed to load: ${(e as Error).message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleDelete = () => {
    if (!transaction) return;
    confirmDelete(
      'Delete transaction?',
      `Remove "${transaction.description || 'Transaction'}"?`,
      async () => {
        try {
          await apiAuth(`/api/transactions/${transaction.id}`, { method: 'DELETE' });
          router.back();
        } catch (e) {
          if (Platform.OS === 'web') {
            window.alert((e as Error).message);
          } else {
            Alert.alert('Error', (e as Error).message);
          }
        }
      }
    );
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiAuthJson<Transaction>(`/api/transactions/${id}`)
      .then(setTransaction)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <ScreenContainer>
        <Text style={styles.helper}>Loading...</Text>
      </ScreenContainer>
    );
  }

  if (error || !transaction) {
    return (
      <ScreenContainer>
        <Text style={styles.error}>{error || 'Transaction not found'}</Text>
      </ScreenContainer>
    );
  }

  const amountStr = transaction.amount >= 0
    ? `-$${transaction.amount.toFixed(2)}`
    : `+$${Math.abs(transaction.amount).toFixed(2)}`;

  return (
    <ScreenContainer>
      <View style={[styles.row, isWebWide && styles.rowWide]}>
        <SectionCard style={styles.receiptPreview}>
          {transaction.receiptUrl ? (
            <AuthImage
              uri={transaction.receiptUrl.startsWith('http') ? transaction.receiptUrl : `${getApiUrl()}${transaction.receiptUrl}`}
              style={styles.receiptImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.receiptText}>No receipt image</Text>
          )}
        </SectionCard>
        <SectionCard style={styles.detailCard}>
          <Text style={styles.title}>{transaction.description || 'Transaction'}</Text>
          <Text style={styles.subtitle}>
            {amountStr} {transaction.category ? `• ${transaction.category}` : ''} • {formatDate(transaction.date)}
          </Text>
          {(transaction.createdAt || transaction.updatedAt) && (
            <Text style={styles.meta}>
              {transaction.updatedAt && new Date(transaction.updatedAt).getTime() > new Date(transaction.createdAt ?? 0).getTime() + 1000
                ? `Updated ${formatDate(transaction.updatedAt)}`
                : `Added ${formatDate(transaction.createdAt!)}`}
            </Text>
          )}
          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete transaction</Text>
          </Pressable>
        </SectionCard>
      </View>

      <SectionCard>
        <Text style={styles.title}>AI Suggestions</Text>
        {aiLoading && <Text style={styles.helper}>Loading suggestions...</Text>}
        {aiSuggestions && !aiLoading && (
          <Text style={styles.body}>{aiSuggestions}</Text>
        )}
        {!aiSuggestions && !aiLoading && (
          <Pressable style={styles.secondaryButton} onPress={fetchAiSuggestions}>
            <Text style={styles.secondaryButtonText}>Get AI suggestions</Text>
          </Pressable>
        )}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 16,
  },
  rowWide: {
    flexDirection: 'row',
  },
  receiptPreview: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  receiptText: {
    color: '#94a3b8',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
    minHeight: 200,
  },
  helper: {
    color: '#94a3b8',
    fontSize: 14,
  },
  error: {
    color: '#f87171',
    fontSize: 14,
  },
  detailCard: {
    flex: 1,
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    color: '#94a3b8',
  },
  meta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 6,
  },
  deleteButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    color: '#f87171',
    fontWeight: '600',
  },
  body: {
    color: '#cbd5f5',
  },
  secondaryButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignSelf: 'flex-start',
  },
  secondaryButtonText: {
    color: '#e2e8f0',
    fontWeight: '600',
  },
});
