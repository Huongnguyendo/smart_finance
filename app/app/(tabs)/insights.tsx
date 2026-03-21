import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useUser } from '../../src/contexts/UserContext';
import { theme } from '../../src/theme';
import { apiAuthJson } from '../../src/lib/api';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SectionCard } from '../../src/components/SectionCard';
import { VictoryLine, VictoryArea } from '../../src/lib/charts';

type ForecastPoint = { x: number; y: number };
type ForecastResponse = { chartData: ForecastPoint[]; projectedNext30: number };

type WeekAmount = { week: string; amount: number };
type CategoryWithPercent = { category: string; amount: number; percent: number };
type MonthComparison = { thisMonth: number; lastMonth: number; changePercent: number };
type MerchantAmount = { merchant: string; amount: number };
type AnalyticsResponse = {
  spendingByWeek: WeekAmount[];
  categoryBreakdown: CategoryWithPercent[];
  monthOverMonth: MonthComparison;
  topMerchants: MerchantAmount[];
  totalSpent: number;
};

type RecurringItem = {
  merchant: string;
  amount: number;
  frequency: string;
  occurrenceCount: number;
  lastOccurredAt: string;
  confidence: number;
};

const CHART_COLORS = [theme.colors.accent, theme.colors.positive, theme.colors.warning, theme.colors.textMuted];

function formatRecurringFreq(f: string): string {
  if (f === 'weekly') return '/week';
  if (f === 'biweekly') return '/2 weeks';
  if (f === 'monthly') return '/month';
  return '';
}

export default function Insights() {
  const { user, isLoading: userLoading } = useUser();
  const isWeb = Platform.OS === 'web';
  const [analyticsRange, setAnalyticsRange] = useState<'week' | 'month' | '3months'>('month');
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [showRecurring, setShowRecurring] = useState(true);
  const [recurring, setRecurring] = useState<RecurringItem[] | null>(null);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [showForecast, setShowForecast] = useState(true);
  const [showBehavioral, setShowBehavioral] = useState(true);
  const [showOptimizations, setShowOptimizations] = useState(true);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [optimizations, setOptimizations] = useState<string | null>(null);
  const [optimizationsLoading, setOptimizationsLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!user?.id) return;
    setAnalyticsLoading(true);
    try {
      const res = await apiAuthJson<AnalyticsResponse>(
        `/api/insights/analytics?range=${analyticsRange}`
      );
      setAnalytics(res);
    } catch (e) {
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [user?.id, analyticsRange]);

  const fetchRecurring = useCallback(async () => {
    if (!user?.id) return;
    setRecurringLoading(true);
    try {
      const res = await apiAuthJson<{ items: RecurringItem[] }>('/api/insights/recurring');
      setRecurring(res.items ?? []);
    } catch {
      setRecurring([]);
    } finally {
      setRecurringLoading(false);
    }
  }, [user?.id]);

  const fetchForecast = useCallback(async () => {
    if (!user?.id) return;
    setForecastLoading(true);
    try {
      const res = await apiAuthJson<ForecastResponse>('/api/insights/forecast');
      setForecast(res);
    } catch (e) {
      setForecast({ chartData: [], projectedNext30: 0 });
    } finally {
      setForecastLoading(false);
    }
  }, [user?.id]);

  const fetchOptimizations = useCallback(async () => {
    if (!user?.id) return;
    setOptimizationsLoading(true);
    try {
      const res = await apiAuthJson<{ text: string }>('/api/insights/optimizations');
      setOptimizations(res.text);
    } catch (e) {
      setOptimizations(`Failed to load: ${(e as Error).message}`);
    } finally {
      setOptimizationsLoading(false);
    }
  }, [user?.id]);

  const fetchAiInsights = useCallback(async () => {
    if (!user?.id) return;
    setAiLoading(true);
    setAiInsights(null);
    try {
      const res = await apiAuthJson<{ text: string }>('/api/insights/overview');
      setAiInsights(res.text);
    } catch (e) {
      setAiInsights(`Failed to load: ${(e as Error).message}`);
    } finally {
      setAiLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) fetchAnalytics();
  }, [user?.id, fetchAnalytics]);

  useEffect(() => {
    if (user?.id) fetchRecurring();
  }, [user?.id, fetchRecurring]);

  useEffect(() => {
    if (user?.id) fetchForecast();
  }, [user?.id, fetchForecast]);

  useEffect(() => {
    fetchOptimizations();
  }, [fetchOptimizations]);

  const analyticsChartData = analytics?.spendingByWeek?.map((d, i) => ({ x: i + 1, y: d.amount })) ?? [];
  const maxChartY = Math.max(10, ...analyticsChartData.map((d) => d.y), 0) + 10;

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
      <SectionCard>
        <Pressable disabled={!isWeb} onPress={() => setShowAnalytics((prev) => !prev)}>
          <Text style={styles.title}>Analytics</Text>
        </Pressable>
        {showAnalytics && (
          <>
            {!user?.id ? (
              <Text style={styles.helper}>Sign in to see analytics.</Text>
            ) : (
              <>
                <View style={styles.rangeRow}>
                  {(['week', 'month', '3months'] as const).map((r) => (
                    <Pressable
                      key={r}
                      style={[styles.rangeButton, analyticsRange === r && styles.rangeButtonActive]}
                      onPress={() => setAnalyticsRange(r)}
                    >
                      <Text style={[styles.rangeButtonText, analyticsRange === r && styles.rangeButtonTextActive]}>
                        {r === 'week' ? '7 days' : r === 'month' ? '30 days' : '90 days'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {analyticsLoading ? (
                  <View style={styles.aiLoading}>
                    <ActivityIndicator size="small" color={theme.colors.accent} />
                    <Text style={styles.helper}>Loading analytics...</Text>
                  </View>
                ) : analytics ? (
                  <>
                    <Text style={styles.analyticsTotal}>
                      Total: ${analytics.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                    {analyticsChartData.length > 0 ? (
                      <View style={styles.chartWrap}>
                        <VictoryArea
                          data={analyticsChartData}
                          style={{ data: { fill: 'rgba(20,184,166,0.2)', stroke: theme.colors.accent } }}
                          height={180}
                          domain={{ y: [0, maxChartY] }}
                        />
                        <VictoryLine
                          data={analyticsChartData}
                          style={{ data: { stroke: theme.colors.accent } }}
                          height={180}
                          domain={{ y: [0, maxChartY] }}
                        />
                      </View>
                    ) : (
                      <Text style={styles.helper}>No spending in this period.</Text>
                    )}
                    {analytics.monthOverMonth.thisMonth > 0 || analytics.monthOverMonth.lastMonth > 0 ? (
                      <View style={styles.momRow}>
                        <Text style={styles.momLabel}>This month vs last:</Text>
                        <Text style={[
                          styles.momValue,
                          analytics.monthOverMonth.changePercent > 0 && styles.momUp,
                          analytics.monthOverMonth.changePercent < 0 && styles.momDown,
                        ]}>
                          {analytics.monthOverMonth.changePercent > 0 ? '+' : ''}
                          {analytics.monthOverMonth.changePercent}%
                        </Text>
                      </View>
                    ) : null}
                    {analytics.categoryBreakdown.length > 0 && (
                      <View style={styles.categoryList}>
                        <Text style={styles.categoryListTitle}>By category</Text>
                        {analytics.categoryBreakdown.map((c, i) => (
                          <View key={c.category} style={styles.categoryRow}>
                            <View style={[styles.categoryDot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                            <Text style={styles.categoryName}>{c.category}</Text>
                            <Text style={styles.categoryAmount}>
                              ${c.amount.toFixed(2)} ({c.percent}%)
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {analytics.topMerchants.length > 0 && (
                      <View style={styles.merchantList}>
                        <Text style={styles.merchantListTitle}>Top merchants</Text>
                        {analytics.topMerchants.slice(0, 5).map((m) => (
                          <View key={m.merchant} style={styles.merchantRow}>
                            <Text style={styles.merchantName} numberOfLines={1}>{m.merchant}</Text>
                            <Text style={styles.merchantAmount}>${m.amount.toFixed(2)}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <Pressable style={styles.refreshButton} onPress={fetchAnalytics}>
                      <Text style={styles.secondaryButtonText}>Refresh</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable style={styles.secondaryButton} onPress={fetchAnalytics}>
                    <Text style={styles.secondaryButtonText}>Load analytics</Text>
                  </Pressable>
                )}
              </>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard>
        <Pressable disabled={!isWeb} onPress={() => setShowRecurring((prev) => !prev)}>
          <Text style={styles.title}>Recurring Transactions</Text>
        </Pressable>
        {showRecurring && (
          <>
            {!user?.id ? (
              <Text style={styles.helper}>Sign in to see recurring transactions.</Text>
            ) : recurringLoading ? (
              <View style={styles.aiLoading}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
                <Text style={styles.helper}>Detecting subscriptions...</Text>
              </View>
            ) : recurring && recurring.length > 0 ? (
              <>
                <Text style={styles.helper}>
                  Detected from your transaction history (last 6 months)
                </Text>
                {recurring.map((r) => (
                  <View key={r.merchant} style={styles.recurringRow}>
                    <View style={styles.recurringInfo}>
                      <Text style={styles.recurringMerchant}>{r.merchant}</Text>
                      <Text style={styles.recurringMeta}>
                        ${r.amount.toFixed(2)}{formatRecurringFreq(r.frequency)} • {r.occurrenceCount}× seen
                      </Text>
                    </View>
                    <Text style={styles.recurringAmount}>${r.amount.toFixed(2)}</Text>
                  </View>
                ))}
                <Pressable style={styles.refreshButton} onPress={fetchRecurring}>
                  <Text style={styles.secondaryButtonText}>Refresh</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.helper}>
                Add more transactions to detect subscriptions (Netflix, rent, etc.). Need 2+ similar charges.
              </Text>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard>
        <Pressable disabled={!isWeb} onPress={() => setShowForecast((prev) => !prev)}>
          <Text style={styles.title}>Forecast</Text>
        </Pressable>
        {showForecast && (
          <>
            {(forecastLoading || (userLoading && !forecast)) && (
              <View style={styles.aiLoading}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
                <Text style={styles.helper}>
                  {userLoading ? 'Loading...' : 'Loading forecast...'}
                </Text>
              </View>
            )}
            {!forecastLoading && forecast && (
              <>
                {forecast.chartData.length > 0 ? (
                  <VictoryLine
                    data={forecast.chartData}
                    style={{ data: { stroke: theme.colors.accent } }}
                    height={200}
                    domain={{ y: [0, Math.max(10, ...forecast.chartData.map((d) => d.y), 0) + 10] }}
                  />
                ) : (
                  <Text style={styles.helper}>No spending data yet. Add transactions to see your forecast.</Text>
                )}
                <Text style={styles.body}>
                  Projected spend next 30 days: ${forecast.projectedNext30.toFixed(2)}
                </Text>
                <Pressable style={styles.refreshButton} onPress={fetchForecast}>
                  <Text style={styles.secondaryButtonText}>Refresh</Text>
                </Pressable>
              </>
            )}
            {!forecastLoading && !forecast && user?.id && (
              <Pressable style={styles.secondaryButton} onPress={fetchForecast}>
                <Text style={styles.secondaryButtonText}>Load forecast</Text>
              </Pressable>
            )}
            {!forecastLoading && !forecast && !user?.id && (
              <Text style={styles.helper}>Sign in to see your forecast.</Text>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard>
        <Pressable disabled={!isWeb} onPress={() => setShowBehavioral((prev) => !prev)}>
          <Text style={styles.title}>AI Insights</Text>
        </Pressable>
        {showBehavioral && (
          <>
            {aiLoading && (
              <View style={styles.aiLoading}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
                <Text style={styles.helper}>Analyzing your transactions...</Text>
              </View>
            )}
            {aiInsights && !aiLoading && (
              <Text style={styles.body}>{aiInsights}</Text>
            )}
            {!aiInsights && !aiLoading && (
              <Pressable style={styles.secondaryButton} onPress={fetchAiInsights}>
                <Text style={styles.secondaryButtonText}>Ask AI for insights</Text>
              </Pressable>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard>
        <Pressable disabled={!isWeb} onPress={() => setShowOptimizations((prev) => !prev)}>
          <Text style={styles.title}>Optimizations</Text>
        </Pressable>
        {showOptimizations && (
          <>
            {optimizationsLoading && (
              <View style={styles.aiLoading}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
                <Text style={styles.helper}>Generating optimization tips...</Text>
              </View>
            )}
            {optimizations && !optimizationsLoading && (
              <>
                <Text style={styles.body}>{optimizations}</Text>
                <Pressable style={styles.refreshButton} onPress={fetchOptimizations}>
                  <Text style={styles.secondaryButtonText}>Refresh</Text>
                </Pressable>
              </>
            )}
            <Link href="/chat" asChild>
              <Pressable style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Chat with AI</Text>
              </Pressable>
            </Link>
          </>
        )}
      </SectionCard>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 17,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  rangeButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rangeButtonActive: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accent,
  },
  rangeButtonText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  rangeButtonTextActive: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  analyticsTotal: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  chartWrap: {
    height: 180,
    marginBottom: 16,
  },
  momRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  momLabel: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  momValue: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  momUp: {
    color: theme.colors.negative,
  },
  momDown: {
    color: theme.colors.positive,
  },
  categoryList: {
    marginBottom: 16,
  },
  categoryListTitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 14,
  },
  categoryAmount: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  merchantList: {
    marginBottom: 16,
  },
  merchantListTitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginBottom: 8,
  },
  merchantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  merchantName: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 14,
  },
  merchantAmount: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  recurringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  recurringInfo: {
    flex: 1,
  },
  recurringMerchant: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  recurringMeta: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  recurringAmount: {
    color: theme.colors.accent,
    fontWeight: '600',
    fontSize: 15,
  },
  body: {
    color: theme.colors.textMuted,
    lineHeight: 22,
  },
  secondaryButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: theme.colors.bgInput,
    borderRadius: theme.radii.md,
  },
  refreshButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  helper: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
});
