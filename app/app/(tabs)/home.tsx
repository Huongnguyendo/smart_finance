import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useUser } from '../../src/contexts/UserContext';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SectionCard } from '../../src/components/SectionCard';
import { theme } from '../../src/theme';
import { VictoryArea, VictoryLine, VictoryPie, VictoryChart, VictoryAxis } from '../../src/lib/charts';
import { apiAuth, apiAuthJson } from '../../src/lib/api';

type BudgetAlert = { category: string; limit: number; spent: number; percent: number; status: string };
type InsightCard = {
  title: string;
  label: string;
  body: string;
  tone: 'neutral' | 'positive' | 'warning' | 'danger';
};

type DashboardResponse = {
  spendingThisMonth: number;
  categoryBreakdown: { category: string; amount: number }[];
  weeklySpending: { day: string; amount: number }[];
  recentTransactions: { description: string; amount: number; category: string | null }[];
  projectedNext30: number;
  quickInsight: string;
  quickInsightCards?: InsightCard[];
  budgetAlerts: BudgetAlert[];
};
const CHART_COLORS = theme.colors.chartColors;

export default function Home() {
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isWide = isWeb && width >= 1024;
  const { user } = useUser();
  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiAuthJson<DashboardResponse>('/api/insights/dashboard');
      setDashboard(res);
    } catch (e) {
      setError((e as Error).message);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const loadDemoData = useCallback(async () => {
    if (!user?.id) return;
    setDemoLoading(true);
    setDemoMessage(null);
    try {
      await apiAuth('/api/demo/seed', { method: 'POST' });
      setDemoMessage('Demo data loaded! Refreshing…');
      await fetchDashboard();
      setDemoMessage(null);
    } catch (e) {
      setDemoMessage((e as Error).message);
    } finally {
      setDemoLoading(false);
    }
  }, [user?.id, fetchDashboard]);

  const spendData = dashboard?.weeklySpending?.map((d) => ({ x: d.day, y: d.amount })) ?? [];
  const categoryData = dashboard?.categoryBreakdown?.map((c) => ({ x: c.category, y: c.amount })) ?? [];
  const budgetAlerts = dashboard?.budgetAlerts ?? [];
  const totalBudget = budgetAlerts.find((b) => b.category.toLowerCase() === 'total');
  const budgetPct = totalBudget
    ? (totalBudget.spent / totalBudget.limit) * 100
    : 0;
  const budgetRemaining = totalBudget
    ? Math.max(0, totalBudget.limit - totalBudget.spent)
    : 0;
  const budgetLimit = totalBudget?.limit ?? 0;
  const alertCount = budgetAlerts.filter((b) => b.status === 'warning' || b.status === 'over').length;
  const recentTransactions = dashboard?.recentTransactions ?? [];

  if (!user?.id) {
    return (
      <ScreenContainer>
        <Text style={styles.cardBody}>Sign in to see your dashboard.</Text>
      </ScreenContainer>
    );
  }

  if (loading && !dashboard) {
    return (
      <ScreenContainer>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading dashboard…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <Text style={styles.cardBody}>Failed to load: {error}</Text>
        <Pressable style={styles.secondaryButton} onPress={fetchDashboard}>
          <Text style={styles.secondaryButtonText}>Retry</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={[styles.headerRow, !isWide && styles.headerStack]}>
        <View>
          <Text style={styles.greeting}>Good evening, {firstName}</Text>
          <Text style={styles.subGreeting}>
            Here's your financial overview for February 2026
          </Text>
        </View>
      </View>

      <View style={[styles.topGrid, !isWide && styles.topGridStack]}>
        <SectionCard style={styles.hero}>
          <Text style={styles.heroLabel}>Spending This Month</Text>
          <Text style={styles.heroValue}>
            ${(dashboard?.spendingThisMonth ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
          <View style={styles.heroRow}>
            <View style={styles.heroStatBlock}>
              <Text style={styles.heroLabel}>Projected Next 30 Days</Text>
              <Text style={[styles.heroStat, styles.negative]}>
                ${(dashboard?.projectedNext30 ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
          {budgetLimit > 0 ? (
            <>
              <View style={styles.budgetRow}>
                <Text style={styles.heroLabel}>Monthly Budget</Text>
                <Text style={styles.budgetText}>
                  ${(dashboard?.spendingThisMonth ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} / ${budgetLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.progressWrapper}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, budgetPct)}%`,
                        backgroundColor: budgetPct > 100 ? theme.colors.warning : budgetPct >= 80 ? theme.colors.warning : theme.colors.accent,
                      },
                    ]}
                  />
                </View>
                {budgetPct > 100 && (
                  <View
                    style={[
                      styles.progressOverflowBar,
                      {
                        flex: Math.min(0.5, (budgetPct - 100) / 100),
                        backgroundColor: theme.colors.negative,
                      },
                    ]}
                  />
                )}
              </View>
              <View style={styles.budgetFootnoteRow}>
                <Text style={[styles.budgetFootnote, budgetPct > 100 && styles.budgetFootnoteOver]}>
                  {Math.round(budgetPct)}% used •{' '}
                  {budgetPct > 100 && totalBudget
                    ? `Over by $${(totalBudget.spent - totalBudget.limit).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    : `$${budgetRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} remaining`}
                </Text>
                <Link href="/(tabs)/budgets" asChild>
                  <Pressable>
                    <Text style={styles.budgetManageLink}>Manage</Text>
                  </Pressable>
                </Link>
              </View>
            </>
          ) : (
            <Link href="/(tabs)/budgets" asChild>
              <Pressable style={styles.budgetCta}>
                <Text style={styles.budgetCtaText}>Set a monthly budget</Text>
                <Text style={styles.budgetCtaSub}>Track spending limits per category</Text>
              </Pressable>
            </Link>
          )}
        </SectionCard>

        <SectionCard style={styles.breakdown}>
          <View style={styles.breakdownHeader}>
            <Text style={styles.cardTitle}>Spending Breakdown</Text>
            <Text style={styles.cardMeta}>This month</Text>
          </View>
          {categoryData.length > 0 ? (
            <VictoryPie
              data={categoryData}
              colorScale={CHART_COLORS}
              labels={() => ''}
              height={220}
              innerRadius={70}
            />
          ) : (
            <View style={styles.chartPlaceholder}>
              <Text style={styles.placeholderText}>No spending this month yet</Text>
            </View>
          )}
          <View style={styles.legend}>
            {categoryData.map((item, index) => (
              <View key={item.x} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }]} />
                <Text style={styles.legendText}>{item.x} ${item.y.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </SectionCard>
      </View>

      <View style={[styles.actionsRow, !isWide && styles.actionsStack]}>
        <Link href="/(tabs)/add" asChild>
          <Pressable style={styles.actionButton}>
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={styles.actionText}>Upload Receipt</Text>
          </Pressable>
        </Link>
        <Link href="/(tabs)/add" asChild>
          <Pressable style={styles.actionButton}>
            <Text style={styles.actionIcon}>＋</Text>
            <Text style={styles.actionText}>Manual Entry</Text>
          </Pressable>
        </Link>
        <Link href="/(tabs)/insights" asChild>
          <Pressable style={styles.actionButton}>
            <Text style={styles.actionIcon}>✨</Text>
            <Text style={styles.actionText}>View Insights</Text>
          </Pressable>
        </Link>
      </View>

      <View style={[styles.midGrid, !isWide && styles.midGridStack]}>
        <SectionCard style={styles.weekly}>
          <View style={styles.breakdownHeader}>
            <Text style={styles.cardTitle}>Weekly Spending</Text>
            <Text style={styles.cardMeta}>This week</Text>
          </View>
          {spendData.length > 0 ? (
            VictoryChart && VictoryAxis ? (
              <VictoryChart
                height={220}
                padding={{ top: 12, bottom: 40, left: 50, right: 12 }}
                domain={{ y: [0, Math.max(10, ...spendData.map((d) => d.y), 0) + 10] }}
              >
                <VictoryAxis
                  dependentAxis
                  tickFormat={(t: number) => `$${Number(t).toFixed(0)}`}
                  style={{
                    axis: { stroke: theme.colors.border },
                    tickLabels: { fill: theme.colors.textMuted, fontSize: 10 },
                    grid: { stroke: 'rgba(148,163,184,0.08)' },
                  }}
                />
                <VictoryAxis
                  style={{
                    axis: { stroke: theme.colors.border },
                    tickLabels: { fill: theme.colors.textMuted, fontSize: 10 },
                  }}
                />
                <VictoryArea
                  data={spendData}
                  style={{ data: { fill: 'rgba(20,184,166,0.2)', stroke: theme.colors.accent } }}
                />
                <VictoryLine
                  data={spendData}
                  style={{ data: { stroke: theme.colors.accent } }}
                />
              </VictoryChart>
            ) : (
              <>
                <VictoryArea
                  data={spendData}
                  style={{ data: { fill: 'rgba(20,184,166,0.2)', stroke: theme.colors.accent } }}
                  height={200}
                  domain={{ y: [0, Math.max(10, ...spendData.map((d) => d.y), 0) + 10] }}
                />
                <VictoryLine
                  data={spendData}
                  style={{ data: { stroke: theme.colors.accent } }}
                  height={200}
                  domain={{ y: [0, Math.max(10, ...spendData.map((d) => d.y), 0) + 10] }}
                />
              </>
            )
          ) : (
            <View style={styles.chartPlaceholder}>
              <Text style={styles.placeholderText}>No spending this week yet</Text>
            </View>
          )}
        </SectionCard>
        <SectionCard style={styles.alerts}>
          <View style={styles.breakdownHeader}>
            <Text style={styles.cardTitle}>Smart Alerts</Text>
            <Text style={styles.cardMeta}>{alertCount}</Text>
          </View>
          {alertCount > 0 ? (
            <>
              {budgetAlerts
                .filter((b) => b.status === 'warning' || b.status === 'over')
                .map((b) => (
                  <View key={b.category} style={styles.alertItem}>
                    <Text style={[styles.alertText, b.status === 'over' && styles.alertOver]}>
                      {b.category}: {b.status === 'over' ? 'Over budget' : 'Approaching limit'} ({b.percent}%)
                    </Text>
                    <Text style={styles.alertDetail}>
                      ${b.spent.toFixed(2)} / ${b.limit.toFixed(2)}
                    </Text>
                  </View>
                ))}
              <Link href="/(tabs)/budgets" asChild>
                <Pressable style={styles.alertLink}>
                  <Text style={styles.secondaryButtonText}>Manage budgets</Text>
                </Pressable>
              </Link>
            </>
          ) : (
            <Text style={styles.cardBody}>
              {budgetAlerts.length > 0
                ? 'All budgets on track.'
                : 'Set budget limits in Profile → Budget Limits to get alerts.'}
            </Text>
          )}
        </SectionCard>
      </View>

      <SectionCard>
        <Text style={styles.cardTitle}>Quick Insights</Text>
        {dashboard?.quickInsightCards && dashboard.quickInsightCards.length > 0 ? (
          <View style={styles.quickInsightGrid}>
            {dashboard.quickInsightCards.map((card) => (
              <View key={card.title} style={[styles.quickInsightCard, styles[`quickInsightCard_${card.tone}`]]}>
                <Text style={styles.quickInsightTitle}>{card.title}</Text>
                <Text style={[styles.quickInsightLabel, styles[`quickInsightLabel_${card.tone}`]]}>
                  {card.label}
                </Text>
                <Text style={styles.quickInsightBody}>{card.body}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.cardBody}>{dashboard?.quickInsight ?? 'Add transactions to get AI insights.'}</Text>
        )}
        <View style={styles.insightsActions}>
          <Pressable
            style={[styles.demoButton, demoLoading && styles.demoButtonDisabled]}
            onPress={loadDemoData}
            disabled={demoLoading}
            testID="load-demo-data"
          >
            {demoLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.demoButtonText}>Load demo data</Text>
            )}
          </Pressable>
          <Link href="/chat" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Ask SmartWallet AI</Text>
            </Pressable>
          </Link>
        </View>
        {demoMessage && (
          <Text style={demoMessage.startsWith('Demo') ? styles.demoSuccess : styles.demoError}>
            {demoMessage}
          </Text>
        )}
      </SectionCard>

      <SectionCard>
        <Text style={styles.cardTitle}>Subscriptions</Text>
        <Text style={styles.cardBody}>
          See recurring transactions we've detected (Netflix, rent, etc.) from your spending patterns.
        </Text>
        <Link href="/(tabs)/insights" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>View recurring transactions</Text>
          </Pressable>
        </Link>
      </SectionCard>

      <SectionCard>
        <Text style={styles.cardTitle}>Recent Transactions</Text>
        {recentTransactions.length > 0 ? (
          recentTransactions.map((tx, i) => (
            <Text key={i} style={styles.cardBody}>
              {tx.description} • ${tx.amount.toFixed(2)}
              {tx.category ? ` (${tx.category})` : ''}
            </Text>
          ))
        ) : (
          <Text style={styles.cardBody}>No recent transactions.</Text>
        )}
      </SectionCard>

      {isWeb ? (
        <Link href="/(tabs)/add" asChild>
          <Pressable style={styles.webAddButton}>
            <Text style={styles.webAddButtonText}>Add Transaction</Text>
          </Pressable>
        </Link>
      ) : (
        <Link href="/(tabs)/add" asChild>
          <Pressable style={styles.fab}>
            <Text style={styles.fabText}>+</Text>
          </Pressable>
        </Link>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: theme.colors.textMuted,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'center',
  },
  headerStack: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  greeting: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subGreeting: {
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  topGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  topGridStack: {
    flexDirection: 'column',
  },
  hero: {
    gap: 12,
    flex: 1.3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  breakdown: {
    flex: 1,
  },
  heroLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  heroValue: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStatBlock: {
    gap: 4,
  },
  heroStat: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  positive: {
    color: theme.colors.positive,
  },
  negative: {
    color: theme.colors.negative,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  budgetText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  progressWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 8,
    gap: 0,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.bgInput,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: theme.colors.accent,
    borderTopLeftRadius: theme.radii.full,
    borderBottomLeftRadius: theme.radii.full,
    borderTopRightRadius: theme.radii.full,
    borderBottomRightRadius: theme.radii.full,
  },
  progressOverflowBar: {
    height: 6,
    minWidth: 8,
    borderRadius: 4,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  budgetFootnote: {
    color: theme.colors.accent,
    fontSize: 12,
  },
  budgetFootnoteOver: {
    color: theme.colors.negative,
  },
  budgetFootnoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  budgetManageLink: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  budgetCta: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  budgetCtaText: {
    color: theme.colors.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  budgetCtaSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  alertItem: {
    marginBottom: 10,
  },
  alertText: {
    color: theme.colors.warning,
    fontSize: 14,
    fontWeight: '500',
  },
  alertOver: {
    color: theme.colors.negative,
  },
  alertDetail: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  alertLink: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardMeta: {
    color: theme.colors.textDim,
    fontSize: 12,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: theme.colors.bgInput,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionsStack: {
    flexDirection: 'column',
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.bgCard,
    paddingVertical: 18,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  midGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  midGridStack: {
    flexDirection: 'column',
  },
  weekly: {
    flex: 1.4,
  },
  alerts: {
    flex: 1,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconText: {
    fontSize: 14,
  },
  alertBody: {
    flex: 1,
  },
  alertTitle: {
    color: theme.colors.text,
    fontSize: 13,
  },
  alertValue: {
    color: theme.colors.accent,
    fontSize: 12,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cardBody: {
    color: theme.colors.textMuted,
  },
  insightsActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  quickInsightGrid: {
    gap: 10,
  },
  quickInsightCard: {
    padding: 14,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgInput,
    gap: 5,
  },
  quickInsightCard_neutral: {
    borderColor: theme.colors.border,
  },
  quickInsightCard_positive: {
    borderColor: 'rgba(52, 211, 153, 0.32)',
  },
  quickInsightCard_warning: {
    borderColor: 'rgba(251, 191, 36, 0.36)',
  },
  quickInsightCard_danger: {
    borderColor: 'rgba(248, 113, 113, 0.36)',
  },
  quickInsightTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  quickInsightLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  quickInsightLabel_neutral: {
    color: theme.colors.textMuted,
  },
  quickInsightLabel_positive: {
    color: theme.colors.positive,
  },
  quickInsightLabel_warning: {
    color: theme.colors.warning,
  },
  quickInsightLabel_danger: {
    color: theme.colors.negative,
  },
  quickInsightBody: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  demoButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  demoButtonDisabled: {
    opacity: 0.7,
  },
  demoButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  demoSuccess: {
    color: theme.colors.positive,
    fontSize: 13,
    marginTop: 8,
  },
  demoError: {
    color: theme.colors.negative,
    fontSize: 13,
    marginTop: 8,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
  },
  webAddButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.accent,
  },
  webAddButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
