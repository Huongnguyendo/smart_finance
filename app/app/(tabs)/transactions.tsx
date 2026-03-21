import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { useUser } from '../../src/contexts/UserContext';
import { apiAuth, apiAuthJson } from '../../src/lib/api';
import { confirmDelete } from '../../src/lib/confirm';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SectionCard } from '../../src/components/SectionCard';
import { theme } from '../../src/theme';

function flattenStyle(style: object | (object | false | undefined)[] | undefined) {
  if (!style) return undefined;
  const arr = Array.isArray(style) ? style.filter(Boolean) : [style];
  return StyleSheet.flatten(arr as object[]);
}

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

type PagedTransactions = {
  content: Transaction[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

function formatAmount(amount: number): string {
  // Expenses (positive) = money out, show minus. Income (negative) = money in, show plus.
  const prefix = amount >= 0 ? '-' : '+';
  return `${prefix}$${Math.abs(amount).toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function formatTransactionDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAddedUpdated(createdAt?: string, updatedAt?: string | null): string {
  if (updatedAt && createdAt && new Date(updatedAt).getTime() > new Date(createdAt).getTime() + 1000) {
    return `Updated ${formatDate(updatedAt)}`;
  }
  return createdAt ? `Added ${formatDate(createdAt)}` : '';
}

export default function Transactions() {
  const { user } = useUser();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWebWide = Platform.OS === 'web' && width >= 768;
  const { search } = useLocalSearchParams<{ search?: string }>();
  const searchFromUrl = typeof search === 'string' ? search : Array.isArray(search) ? search[0] ?? '' : '';
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchFromUrl);
  const [debouncedSearch, setDebouncedSearch] = useState(searchFromUrl);
  const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest');
  const [amountSort, setAmountSort] = useState<'high' | 'low' | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const filtersChangedRef = useRef(false);

  useEffect(() => {
    if (searchFromUrl) {
      setSearchQuery(searchFromUrl);
      setDebouncedSearch(searchFromUrl);
    }
  }, [searchFromUrl]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleDelete = useCallback((tx: Transaction) => {
    confirmDelete(
      'Delete transaction?',
      `Remove "${tx.description || 'Transaction'}" (${formatAmount(tx.amount)})?`,
      async () => {
        try {
          await apiAuth(`/api/transactions/${tx.id}`, { method: 'DELETE' });
          setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
        } catch (e) {
          if (Platform.OS === 'web') {
            window.alert((e as Error).message);
          } else {
            Alert.alert('Error', (e as Error).message);
          }
        }
      }
    );
  }, []);

  const PAGE_SIZE = 20;

  const buildSortParam = useCallback(() => {
    if (amountSort === 'high') return 'amountDesc';
    if (amountSort === 'low') return 'amountAsc';
    return dateSort === 'oldest' ? 'dateAsc' : 'dateDesc';
  }, [amountSort, dateSort]);

  const loadTransactions = useCallback(async (pageNum = 0) => {
    if (!user?.id) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        size: String(PAGE_SIZE),
        sort: buildSortParam(),
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (categoryFilter) params.set('category', categoryFilter);
      const data = await apiAuthJson<PagedTransactions>(
        `/api/transactions?${params.toString()}`
      );
      setTransactions(data.content);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (e) {
      setError((e as Error).message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, debouncedSearch, categoryFilter, buildSortParam]);

  const loadCategories = useCallback(async () => {
    if (!user?.id) return;
    try {
      const list = await apiAuthJson<string[]>('/api/transactions/categories');
      setCategories(list ?? []);
    } catch {
      setCategories([]);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions(0);
      loadCategories();
    }, [loadTransactions, loadCategories])
  );

  useEffect(() => {
    if (!filtersChangedRef.current) {
      filtersChangedRef.current = true;
      return;
    }
    loadTransactions(0);
  }, [loadTransactions]);

  const goToPage = useCallback((pageNum: number) => {
    if (loading || pageNum < 0 || pageNum >= totalPages) return;
    loadTransactions(pageNum);
  }, [loading, totalPages, loadTransactions]);

  // Page numbers to show: current ± 2, or all if few pages
  const pageNumbers = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i);
    const start = Math.max(0, page - 2);
    const end = Math.min(totalPages, page + 3);
    return Array.from({ length: end - start }, (_, i) => start + i);
  })();

  return (
    <ScreenContainer>
      <SectionCard>
        <TextInput
          style={styles.input}
          placeholder="Search transactions"
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filters}>
          <Pressable
            style={[styles.filterChip, dateSort && styles.filterChipActive]}
            onPress={() => setDateSort((s) => (s === 'newest' ? 'oldest' : 'newest'))}
          >
            <Text style={[styles.filterChipText, dateSort && styles.filterChipTextActive]}>
              Date {dateSort === 'oldest' ? '↑' : '↓'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, categoryFilter && styles.filterChipActive]}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text style={[styles.filterChipText, categoryFilter && styles.filterChipTextActive]}>
              {categoryFilter || 'Category'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, amountSort && styles.filterChipActive]}
            onPress={() =>
              setAmountSort((s) => (s === null ? 'high' : s === 'high' ? 'low' : null))
            }
          >
            <Text style={[styles.filterChipText, amountSort && styles.filterChipTextActive]}>
              Amount {amountSort === 'high' ? '↓' : amountSort === 'low' ? '↑' : ''}
            </Text>
          </Pressable>
        </View>
        <Modal
          visible={showCategoryPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCategoryPicker(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowCategoryPicker(false)}
          >
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Filter by category</Text>
              <ScrollView style={styles.modalList}>
                <Pressable
                  style={[styles.modalItem, !categoryFilter && styles.modalItemActive]}
                  onPress={() => {
                    setCategoryFilter(null);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={[styles.modalItemText, !categoryFilter && styles.modalItemTextActive]}>
                    All
                  </Text>
                </Pressable>
                {categories.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[styles.modalItem, categoryFilter === cat && styles.modalItemActive]}
                    onPress={() => {
                      setCategoryFilter(cat);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text
                      style={[styles.modalItemText, categoryFilter === cat && styles.modalItemTextActive]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                style={styles.modalClose}
                onPress={() => setShowCategoryPicker(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </SectionCard>

      <SectionCard style={isWebWide ? styles.tableCard : undefined}>
        {loading && (
          <Text style={styles.helper}>Loading transactions...</Text>
        )}
        {error && (
          <Text style={styles.error}>{error}</Text>
        )}
        {!loading && !error && transactions.length === 0 && !debouncedSearch.trim() && !categoryFilter && (
          <Text style={styles.helper}>No transactions yet. Add one from the Add tab.</Text>
        )}
        {!loading && !error && transactions.length === 0 && (debouncedSearch.trim() || categoryFilter) && (
          <Text style={styles.helper}>
            No matches
            {debouncedSearch.trim() && ` for "${debouncedSearch}"`}
            {categoryFilter && ` in ${categoryFilter}`}.
          </Text>
        )}
        {!loading && !error && transactions.map((tx) => (
          <View key={tx.id} style={flattenStyle([styles.card, isWebWide && styles.cardWide])}>
            <Pressable
              style={styles.cardMain}
              onPress={() => router.push(`/transaction/${tx.id}`)}
            >
              <View>
                <Text style={styles.title}>{tx.description || 'Transaction'}</Text>
                <Text style={styles.subtitle}>
                  {formatTransactionDate(tx.date)}
                  {tx.category && ` • ${tx.category}`}
                  {(tx.createdAt || tx.updatedAt) && ` • ${formatAddedUpdated(tx.createdAt, tx.updatedAt)}`}
                </Text>
              </View>
              <Text style={[styles.amount, tx.amount >= 0 ? styles.negative : styles.positive]}>
                {formatAmount(tx.amount)}
              </Text>
            </Pressable>
            <Pressable
              style={styles.deleteBtn}
              onPress={() => handleDelete(tx)}
              hitSlop={8}
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </Pressable>
          </View>
        ))}
        {!loading && !error && transactions.length > 0 && totalPages > 0 && (
          <View style={styles.paginationFooter}>
            <Text style={styles.paginationInfo}>
              Showing {transactions.length} of {totalElements} transaction{totalElements !== 1 ? 's' : ''}
            </Text>
            {totalPages > 1 && (
              <View style={styles.paginationControls}>
                <Pressable
                  style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
                  onPress={() => goToPage(page - 1)}
                  disabled={page === 0 || loading}
                >
                  <Text style={[styles.pageBtnText, page === 0 && styles.pageBtnTextDisabled]}>
                    Previous
                  </Text>
                </Pressable>
                <View style={styles.pageNumbers}>
                  {pageNumbers.map((p) => (
                    <Pressable
                      key={p}
                      style={[styles.pageNumBtn, p === page && styles.pageNumBtnActive]}
                      onPress={() => goToPage(p)}
                      disabled={loading}
                    >
                      <Text style={[styles.pageNumText, p === page && styles.pageNumTextActive]}>
                        {p + 1}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  style={[styles.pageBtn, page >= totalPages - 1 && styles.pageBtnDisabled]}
                  onPress={() => goToPage(page + 1)}
                  disabled={page >= totalPages - 1 || loading}
                >
                  <Text style={[styles.pageBtnText, page >= totalPages - 1 && styles.pageBtnTextDisabled]}>
                    Next
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  filterChip: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  filterChipActive: {
    backgroundColor: theme.colors.accentMuted,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  filterChipText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radii.lg,
    padding: 20,
    maxWidth: 320,
    width: '100%',
    maxHeight: 400,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  modalList: {
    maxHeight: 280,
    marginBottom: 16,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: theme.radii.md,
  },
  modalItemActive: {
    backgroundColor: theme.colors.accentMuted,
  },
  modalItemText: {
    color: theme.colors.text,
    fontSize: 14,
  },
  modalItemTextActive: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  modalClose: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  tableCard: {
    gap: 12,
  },
  card: {
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardWide: {
    flexDirection: 'row',
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
  },
  deleteBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
  },
  amount: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  positive: {
    color: '#10B981',
  },
  negative: {
    color: '#f87171',
  },
  helper: {
    color: '#94a3b8',
    fontSize: 14,
  },
  error: {
    color: '#f87171',
    fontSize: 14,
  },
  paginationFooter: {
    marginTop: 16,
    gap: 12,
  },
  paginationInfo: {
    color: '#94a3b8',
    fontSize: 13,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  pageBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1f2937',
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageBtnText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  pageBtnTextDisabled: {
    color: '#94a3b8',
  },
  pageNumbers: {
    flexDirection: 'row',
    gap: 4,
  },
  pageNumBtn: {
    minWidth: 36,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1f2937',
    alignItems: 'center',
  },
  pageNumBtnActive: {
    backgroundColor: theme.colors.accentMuted,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  pageNumText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '500',
  },
  pageNumTextActive: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
});
