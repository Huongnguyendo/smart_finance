import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useUser } from '../../src/contexts/UserContext';
import { theme } from '../../src/theme';
import { apiAuthJson } from '../../src/lib/api';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SectionCard } from '../../src/components/SectionCard';

type Budget = { id: number; categoryName: string; limitAmount: number };

export default function Budgets() {
  const { user } = useUser();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallLimit, setOverallLimit] = useState('');
  const [overallSubmitting, setOverallSubmitting] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalBudget = budgets.find((b) => b.categoryName.toLowerCase() === 'total');
  const categoryBudgets = budgets.filter((b) => b.categoryName.toLowerCase() !== 'total');

  const fetchBudgets = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await apiAuthJson<Budget[]>('/api/budgets');
      setBudgets(res);
    } catch {
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const saveOverallBudget = async () => {
    const limit = parseFloat(overallLimit);
    if (isNaN(limit) || limit <= 0) {
      Alert.alert('Invalid input', 'Enter a positive monthly budget.');
      return;
    }
    if (!user?.id) return;
    setOverallSubmitting(true);
    try {
      if (totalBudget) {
        await apiAuthJson(`/api/budgets/${totalBudget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, limitAmount: limit }),
        });
      } else {
        await apiAuthJson('/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, categoryName: 'Total', limitAmount: limit }),
        });
      }
      setOverallLimit('');
      fetchBudgets();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save budget.');
    } finally {
      setOverallSubmitting(false);
    }
  };

  const removeOverallBudget = () => {
    if (!totalBudget) return;
    Alert.alert('Remove overall budget', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (!user?.id) return;
          try {
            await apiAuthJson(`/api/budgets/${totalBudget.id}`, { method: 'DELETE' });
            setOverallLimit('');
            fetchBudgets();
          } catch {
            Alert.alert('Error', 'Failed to remove budget.');
          }
        },
      },
    ]);
  };

  const addBudget = async () => {
    const cat = newCategory.trim();
    const limit = parseFloat(newLimit);
    if (!cat || isNaN(limit) || limit <= 0) {
      Alert.alert('Invalid input', 'Enter a category name and a positive limit.');
      return;
    }
    if (cat.toLowerCase() === 'total') {
      Alert.alert('Tip', 'Use the "Overall monthly budget" section above for your total budget.');
      return;
    }
    if (!user?.id) return;
    setSubmitting(true);
    try {
      await apiAuthJson('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, categoryName: cat, limitAmount: limit }),
      });
      setNewCategory('');
      setNewLimit('');
      fetchBudgets();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to add budget';
      Alert.alert('Error', msg.includes('already exists') ? `Budget for ${cat} already exists.` : msg);
    } finally {
      setSubmitting(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBudgets();
    }, [fetchBudgets])
  );

  const deleteBudget = (id: number, category: string) => {
    Alert.alert('Delete budget', `Remove budget for ${category}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!user?.id) return;
          try {
            await apiAuthJson(`/api/budgets/${id}`, { method: 'DELETE' });
            fetchBudgets();
          } catch {
            Alert.alert('Error', 'Failed to delete budget.');
          }
        },
      },
    ]);
  };

  if (!user?.id) {
    return (
      <ScreenContainer>
        <Text style={styles.helper}>Sign in to manage budgets.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <SectionCard>
            <Text style={styles.title}>Overall Monthly Budget</Text>
            <Text style={styles.subtitle}>
              Your total spending limit for the month across all categories.
            </Text>
            {totalBudget ? (
              <View style={styles.overallRow}>
                <View style={styles.overallDisplay}>
                  <Text style={styles.overallLabel}>Current limit</Text>
                  <Text style={styles.overallValue}>${totalBudget.limitAmount.toFixed(2)}</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.overallInput]}
                  placeholder="New amount"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                  value={overallLimit}
                  onChangeText={setOverallLimit}
                />
                <View style={styles.overallActions}>
                  <Pressable
                    style={[styles.saveButton, (overallSubmitting || !overallLimit.trim()) && styles.buttonDisabled]}
                    onPress={saveOverallBudget}
                    disabled={overallSubmitting || !overallLimit.trim()}
                  >
                    {overallSubmitting ? (
                      <ActivityIndicator size="small" color={theme.colors.bg} />
                    ) : (
                      <Text style={styles.saveButtonText}>Update</Text>
                    )}
                  </Pressable>
                  <Pressable style={styles.removeButton} onPress={removeOverallBudget}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.overallForm}>
                <TextInput
                  style={styles.input}
                  placeholder="Monthly budget ($)"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                  value={overallLimit}
                  onChangeText={setOverallLimit}
                />
                <Pressable
                  style={[styles.addButton, overallSubmitting && styles.addButtonDisabled]}
                  onPress={saveOverallBudget}
                  disabled={overallSubmitting}
                >
                  {overallSubmitting ? (
                    <ActivityIndicator size="small" color={theme.colors.accent} />
                  ) : (
                    <Text style={styles.addButtonText}>Set Overall Budget</Text>
                  )}
                </Pressable>
              </View>
            )}
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>Category Budgets</Text>
            <Text style={styles.subtitleSmall}>
              Optional limits per category (Food, Transport, etc.)
            </Text>
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Category (e.g. Food, Transport)"
                placeholderTextColor="#64748b"
                value={newCategory}
                onChangeText={setNewCategory}
              />
              <TextInput
                style={styles.input}
                placeholder="Monthly limit ($)"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
                value={newLimit}
                onChangeText={setNewLimit}
              />
              <Pressable
                style={[styles.addButton, submitting && styles.addButtonDisabled]}
                onPress={addBudget}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <Text style={styles.addButtonText}>Add Category Budget</Text>
                )}
              </Pressable>
            </View>
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>Your Category Budgets</Text>
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : categoryBudgets.length === 0 ? (
              <Text style={styles.helper}>No category budgets yet.</Text>
            ) : (
              categoryBudgets.map((b) => (
                <View key={b.id} style={styles.budgetRow}>
                  <View style={styles.budgetInfo}>
                    <Text style={styles.budgetCategory}>{b.categoryName}</Text>
                    <Text style={styles.budgetLimit}>${b.limitAmount.toFixed(2)}</Text>
                  </View>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => deleteBudget(b.id, b.categoryName)}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </Pressable>
                </View>
              ))
            )}
          </SectionCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginBottom: 16,
  },
  subtitleSmall: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: 12,
  },
  overallForm: {
    gap: 12,
  },
  overallRow: {
    gap: 12,
  },
  overallDisplay: {
    marginBottom: 4,
  },
  overallLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  overallValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  overallInput: {
    flex: 1,
  },
  overallActions: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.radii.md,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: theme.colors.bg,
    fontWeight: '600',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  removeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  removeButtonText: {
    color: theme.colors.negative,
    fontSize: 14,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: theme.colors.bgInput,
    borderRadius: theme.radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    borderRadius: theme.radii.md,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    color: theme.colors.bg,
    fontWeight: '600',
    fontSize: 16,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  budgetInfo: {
    flex: 1,
  },
  budgetCategory: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  budgetLimit: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  deleteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteBtnText: {
    color: theme.colors.negative,
    fontSize: 14,
  },
  helper: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
});
