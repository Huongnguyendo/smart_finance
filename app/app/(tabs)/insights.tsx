import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useUser } from '../../src/contexts/UserContext';
import { theme } from '../../src/theme';
import { apiAuthJson } from '../../src/lib/api';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SectionCard } from '../../src/components/SectionCard';
import { VictoryLine, VictoryArea } from '../../src/lib/charts';

type ForecastPoint = { x: number; y: number };
type ForecastResponse = { chartData: ForecastPoint[]; projectedNext30: number };
type InsightCard = {
  title: string;
  label: string;
  body: string;
  tone: 'neutral' | 'positive' | 'warning' | 'danger';
};

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
const TONE_LABELS: Record<InsightCard['tone'], string> = {
  neutral: 'Insight',
  positive: 'Opportunity',
  warning: 'Watch',
  danger: 'Risk',
};

function formatRecurringFreq(f: string): string {
  if (f === 'weekly') return '/week';
  if (f === 'biweekly') return '/2 weeks';
  if (f === 'monthly') return '/month';
  return '';
}

export default function Insights() {
  const { user, isLoading: userLoading } = useUser();
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isWide = isWeb && width >= 900;
  const [analyticsRange, setAnalyticsRange] = useState<'week' | 'month' | '3months'>('month');
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [recurring, setRecurring] = useState<RecurringItem[] | null>(null);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiCards, setAiCards] = useState<InsightCard[]>([]);
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
    setAiCards([]);
    try {
      const res = await apiAuthJson<{ text: string; cards?: InsightCard[] }>('/api/insights/overview');
      setAiInsights(res.text);
      setAiCards(res.cards ?? []);
    } catch (e) {
      setAiInsights(`Failed to load: ${(e as Error).message}`);
      setAiCards([]);
    } finally {
      setAiLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) fetchAnalytics();
  }, [user?.id, fetchAnalytics]);

  useEffect(() => {
    if (user?.id) fetchForecast();
  }, [user?.id, fetchForecast]);

  useEffect(() => {
    if (user?.id && aiCards.length === 0 && !aiInsights && !aiLoading) {
      fetchAiInsights();
    }
  }, [user?.id, aiCards.length, aiInsights, aiLoading, fetchAiInsights]);

  const analyticsChartData = analytics?.spendingByWeek?.map((d, i) => ({ x: i + 1, y: d.amount })) ?? [];
  const maxChartY = Math.max(10, ...analyticsChartData.map((d) => d.y), 0) + 10;

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
      <SectionCard style={styles.aiPanel}>
        <View style={styles.aiHeader}>
          <View>
            <Text style={styles.eyebrow}>SmartWallet AI</Text>
            <Text style={styles.aiTitle}>Financial Insights</Text>
          </View>
          <View style={styles.aiStatusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.aiStatusText}>Live</Text>
          </View>
        </View>

        {aiLoading && (
          <View style={styles.aiLoading}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.helper}>Analyzing your transactions...</Text>
          </View>
        )}

        {aiCards.length > 0 && !aiLoading && (
          <View style={[styles.insightGrid, isWide && styles.insightGridWide]}>
            {aiCards.map((card) => (
              <View key={card.title} style={[styles.insightCard, isWide && styles.insightCardWide, styles[`insightCard_${card.tone}`]]}>
                <View style={styles.insightTopRow}>
                  <Text style={styles.insightTitle}>{card.title}</Text>
                  <View style={[styles.toneBadge, styles[`toneBadge_${card.tone}`]]}>
                    <Text style={[styles.toneBadgeText, styles[`insightLabel_${card.tone}`]]}>
                      {TONE_LABELS[card.tone] ?? card.label}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.insightLabel, styles[`insightLabel_${card.tone}`]]}>
                  {card.label}
                </Text>
                <Text style={styles.insightBody}>{card.body}</Text>
              </View>
            ))}
          </View>
        )}

        {aiInsights && aiCards.length === 0 && !aiLoading && (
          <Text style={styles.body}>{aiInsights}</Text>
        )}

        {!user?.id && !aiLoading && (
          <Text style={styles.helper}>Sign in to see AI insights.</Text>
        )}

        <View style={styles.aiActionRow}>
          <Pressable
            style={[styles.primaryButton, (!user?.id || aiLoading) && styles.disabledButton]}
            onPress={fetchAiInsights}
            disabled={!user?.id || aiLoading}
          >
            <Text style={styles.primaryButtonText}>
              {aiCards.length > 0 || aiInsights ? 'Refresh AI insights' : 'Generate insights'}
            </Text>
          </Pressable>
          <Link href="/chat" asChild>
            <Pressable style={styles.secondaryButtonInline}>
              <Text style={styles.secondaryButtonText}>Ask SmartWallet AI</Text>
            </Pressable>
          </Link>
        </View>
      </SectionCard>

      <SectionCard>
        <Pressable disabled={!isWeb} onPress={() => setShowAnalytics((prev) => !prev)}>
          <Text style={styles.title}>Spending Analytics</Text>
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
                    <View style={[styles.analyticsForecastGrid, isWide && styles.analyticsForecastGridWide]}>
                      <View style={styles.analyticsMain}>
                        <Text style={styles.analyticsTotal}>
                          Total: ${analytics.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </Text>
                        {analyticsChartData.length > 0 ? (
                          <View style={styles.chartWrap}>
                            <VictoryArea
                              data={analyticsChartData}
                              style={{ data: { fill: 'rgba(20,184,166,0.2)', stroke: theme.colors.accent } }}
                              height={160}
                              domain={{ y: [0, maxChartY] }}
                            />
                            <VictoryLine
                              data={analyticsChartData}
                              style={{ data: { stroke: theme.colors.accent } }}
                              height={160}
                              domain={{ y: [0, maxChartY] }}
                            />
                          </View>
                        ) : (
                          <Text style={styles.helper}>No spending in this period.</Text>
                        )}
                      </View>

                      <View style={[styles.forecastPanel, isWide && styles.forecastPanelWide]}>
                        <Text style={styles.panelLabel}>Forecast</Text>
                        {(forecastLoading || (userLoading && !forecast)) ? (
                          <View style={styles.aiLoading}>
                            <ActivityIndicator size="small" color={theme.colors.accent} />
                            <Text style={styles.helper}>{userLoading ? 'Loading...' : 'Loading forecast...'}</Text>
                          </View>
                        ) : forecast ? (
                          <>
                            <Text style={styles.forecastValue}>
                              ${forecast.projectedNext30.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </Text>
                            <Text style={styles.forecastCaption}>Projected next 30 days</Text>
                            <View style={styles.forecastDivider} />
                            <View style={styles.forecastStatRow}>
                              <Text style={styles.forecastStatLabel}>Daily pace</Text>
                              <Text style={styles.forecastStatValue}>
                                ${(forecast.projectedNext30 / 30).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </Text>
                            </View>
                            <Text style={styles.forecastNote}>
                              Based on your last 30 days of recorded spending.
                            </Text>
                            <Pressable style={styles.refreshButton} onPress={fetchForecast}>
                              <Text style={styles.secondaryButtonText}>Refresh forecast</Text>
                            </Pressable>
                          </>
                        ) : (
                          <Pressable style={styles.secondaryButton} onPress={fetchForecast}>
                            <Text style={styles.secondaryButtonText}>Load forecast</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
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

      <SectionCard style={styles.moreToolsCard}>
        <Pressable onPress={() => setShowMoreTools((prev) => !prev)} style={styles.moreToolsHeader}>
          <View>
            <Text style={styles.title}>More Tools</Text>
            <Text style={styles.helper}>Recurring charges, optimization tips, and AI chat.</Text>
          </View>
          <Text style={styles.chevron}>{showMoreTools ? '−' : '+'}</Text>
        </Pressable>

        {showMoreTools && (
          <View style={styles.toolsList}>
            <View style={styles.toolBlock}>
              <View style={styles.toolHeader}>
                <View>
                  <Text style={styles.toolTitle}>Recurring Transactions</Text>
                  <Text style={styles.helper}>Find subscriptions and repeated charges.</Text>
                </View>
                <Pressable style={styles.smallButton} onPress={fetchRecurring} disabled={recurringLoading || !user?.id}>
                  <Text style={styles.secondaryButtonText}>{recurring ? 'Refresh' : 'Load'}</Text>
                </Pressable>
              </View>
              {!user?.id ? (
                <Text style={styles.helper}>Sign in to see recurring transactions.</Text>
              ) : recurringLoading ? (
                <View style={styles.aiLoading}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                  <Text style={styles.helper}>Detecting subscriptions...</Text>
                </View>
              ) : recurring && recurring.length > 0 ? (
                recurring.slice(0, 4).map((r) => (
                  <View key={r.merchant} style={styles.recurringRow}>
                    <View style={styles.recurringInfo}>
                      <Text style={styles.recurringMerchant}>{r.merchant}</Text>
                      <Text style={styles.recurringMeta}>
                        ${r.amount.toFixed(2)}{formatRecurringFreq(r.frequency)} • {r.occurrenceCount}× seen
                      </Text>
                    </View>
                    <Text style={styles.recurringAmount}>${r.amount.toFixed(2)}</Text>
                  </View>
                ))
              ) : recurring ? (
                <Text style={styles.helper}>No recurring transactions detected yet.</Text>
              ) : null}
            </View>

            <View style={styles.toolBlock}>
              <View style={styles.toolHeader}>
                <View>
                  <Text style={styles.toolTitle}>Optimization Tips</Text>
                  <Text style={styles.helper}>Ask AI for a short savings plan.</Text>
                </View>
                <Pressable style={styles.smallButton} onPress={fetchOptimizations} disabled={optimizationsLoading || !user?.id}>
                  <Text style={styles.secondaryButtonText}>{optimizations ? 'Refresh' : 'Generate'}</Text>
                </Pressable>
              </View>
              {optimizationsLoading && (
                <View style={styles.aiLoading}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                  <Text style={styles.helper}>Generating tips...</Text>
                </View>
              )}
              {optimizations && !optimizationsLoading && (
                <Text style={styles.body}>{optimizations}</Text>
              )}
            </View>

            <Link href="/chat" asChild>
              <Pressable style={styles.chatTool}>
                <View>
                  <Text style={styles.toolTitle}>Ask SmartWallet AI</Text>
                  <Text style={styles.helper}>Open the full finance assistant chat.</Text>
                </View>
                <Text style={styles.secondaryButtonText}>Open</Text>
              </Pressable>
            </Link>
          </View>
        )}
      </SectionCard>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  aiPanel: {
    borderColor: 'rgba(20, 184, 166, 0.28)',
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  aiTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  aiStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.accentMuted,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.28)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.positive,
  },
  aiStatusText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
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
  analyticsForecastGrid: {
    gap: 14,
    marginBottom: 14,
  },
  analyticsForecastGridWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  analyticsMain: {
    flex: 1.45,
  },
  chartWrap: {
    height: 160,
  },
  forecastPanel: {
    padding: 14,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.22)',
    backgroundColor: theme.colors.bgInput,
    gap: 6,
  },
  forecastPanelWide: {
    flex: 0.8,
    minWidth: 240,
  },
  panelLabel: {
    color: theme.colors.warning,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  forecastValue: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  forecastCaption: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  forecastDivider: {
    height: 1,
    backgroundColor: 'rgba(251, 191, 36, 0.24)',
    marginVertical: 8,
  },
  forecastStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  forecastStatLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  forecastStatValue: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  forecastNote: {
    color: theme.colors.textDim,
    fontSize: 12,
    lineHeight: 18,
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
  moreToolsCard: {
    gap: 14,
  },
  moreToolsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  chevron: {
    color: theme.colors.accent,
    fontSize: 26,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
  toolsList: {
    gap: 14,
  },
  toolBlock: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 10,
  },
  toolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  toolTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chatTool: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  body: {
    color: theme.colors.textMuted,
    lineHeight: 22,
  },
  insightGrid: {
    gap: 10,
    marginTop: 4,
  },
  insightGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  insightCard: {
    padding: 14,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgInput,
    gap: 6,
  },
  insightCardWide: {
    width: '48.8%',
    minHeight: 142,
  },
  insightCard_neutral: {
    borderColor: theme.colors.border,
  },
  insightCard_positive: {
    borderColor: 'rgba(52, 211, 153, 0.32)',
  },
  insightCard_warning: {
    borderColor: 'rgba(251, 191, 36, 0.36)',
  },
  insightCard_danger: {
    borderColor: 'rgba(248, 113, 113, 0.36)',
  },
  insightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  insightTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  toneBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radii.full,
    borderWidth: 1,
  },
  toneBadge_neutral: {
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderColor: theme.colors.border,
  },
  toneBadge_positive: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderColor: 'rgba(52, 211, 153, 0.24)',
  },
  toneBadge_warning: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.24)',
  },
  toneBadge_danger: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: 'rgba(248, 113, 113, 0.24)',
  },
  toneBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  insightLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  insightLabel_neutral: {
    color: theme.colors.textMuted,
  },
  insightLabel_positive: {
    color: theme.colors.positive,
  },
  insightLabel_warning: {
    color: theme.colors.warning,
  },
  insightLabel_danger: {
    color: theme.colors.negative,
  },
  insightBody: {
    color: theme.colors.textMuted,
    lineHeight: 20,
    fontSize: 13,
  },
  aiActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: theme.radii.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.55,
  },
  secondaryButtonInline: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
