package com.smartwallet.insights.web;

import com.smartwallet.core.domain.Transaction;
import com.smartwallet.core.domain.Budget;
import com.smartwallet.insights.service.InsightsService;
import com.smartwallet.insights.service.InsightsService.InsightCard;
import com.smartwallet.insights.service.InsightsService.TransactionSummary;
import com.smartwallet.insights.service.RecurringDetectionService;
import com.smartwallet.transactions.service.BudgetService;
import com.smartwallet.transactions.service.TransactionService;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.smartwallet.core.domain.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/insights")
public class InsightsController {

  private final InsightsService insightsService;
  private final TransactionService transactionService;
  private final BudgetService budgetService;
  private final RecurringDetectionService recurringDetectionService;

  public InsightsController(InsightsService insightsService, TransactionService transactionService,
      BudgetService budgetService, RecurringDetectionService recurringDetectionService) {
    this.insightsService = insightsService;
    this.transactionService = transactionService;
    this.budgetService = budgetService;
    this.recurringDetectionService = recurringDetectionService;
  }

  @PostMapping("/transaction-suggestions")
  public InsightsResponse getTransactionSuggestions(@RequestBody TransactionSuggestionsRequest request) {
    String text = insightsService.getTransactionSuggestions(
        request.description(),
        request.amount(),
        request.category()
    );
    return new InsightsResponse(text);
  }

  @GetMapping("/overview")
  public InsightsResponse getOverview(@AuthenticationPrincipal User user) {
    var transactions = transactionService.listForUser(user.getId()).stream()
        .limit(20)
        .map(tx -> new TransactionSummary(
            tx.getDescription() != null ? tx.getDescription() : "Unknown",
            Math.abs(tx.getAmount().doubleValue()),
            tx.getCategory() != null ? tx.getCategory().getName() : null
        ))
        .toList();
    String text = insightsService.getOverviewInsights(user.getId(), transactions);
    List<InsightCard> cards = insightsService.getOverviewInsightCards(user.getId(), transactions);
    return new InsightsResponse(text, cards);
  }

  @GetMapping("/dashboard")
  public DashboardResponse getDashboard(@AuthenticationPrincipal User user) {
    java.time.Instant now = java.time.Instant.now();
    java.time.Instant monthStart = now.atZone(java.time.ZoneOffset.UTC)
        .withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0).toInstant();
    java.time.Instant weekStart = now.minus(6, java.time.temporal.ChronoUnit.DAYS);

    var monthTxs = transactionService.listForUserBetween(user.getId(), monthStart, now);
    var last30Txs = transactionService.listForUserBetween(user.getId(), now.minus(30, java.time.temporal.ChronoUnit.DAYS), now);
    var recentTxs = transactionService.listForUser(user.getId()).stream().limit(5).toList();

    double spendingThisMonth = monthTxs.stream()
        .filter(tx -> tx.getOccurredAt() != null)
        .mapToDouble(tx -> Math.abs(tx.getAmount().doubleValue()))
        .sum();

    var byCategory = monthTxs.stream()
        .filter(tx -> tx.getOccurredAt() != null)
        .collect(Collectors.groupingBy(
            tx -> tx.getCategory() != null ? tx.getCategory().getName() : "Other",
            Collectors.summingDouble(tx -> Math.abs(tx.getAmount().doubleValue()))
        ));
    var categoryBreakdown = byCategory.entrySet().stream()
        .map(e -> new CategoryAmount(e.getKey(), Math.round(e.getValue() * 100) / 100.0))
        .toList();

    var byDay = monthTxs.stream()
        .filter(tx -> tx.getOccurredAt() != null && !tx.getOccurredAt().isBefore(weekStart))
        .collect(Collectors.groupingBy(
            tx -> tx.getOccurredAt().atZone(ZoneOffset.UTC).toLocalDate(),
            Collectors.summingDouble(tx -> Math.abs(tx.getAmount().doubleValue()))
        ));
    List<LocalDate> last7 = LocalDate.now(ZoneOffset.UTC).minusDays(6).datesUntil(LocalDate.now(ZoneOffset.UTC).plusDays(1)).toList();
    var weeklySpending = last7.stream()
        .map(d -> new DayAmount(d.getDayOfWeek().name().substring(0, 3), byDay.getOrDefault(d, 0.0)))
        .toList();

    var recent = recentTxs.stream()
        .map(tx -> new RecentTransaction(
            tx.getDescription() != null ? tx.getDescription() : "Transaction",
            Math.abs(tx.getAmount().doubleValue()),
            tx.getCategory() != null ? tx.getCategory().getName() : null
        ))
        .toList();

    double total30 = last30Txs.stream()
        .filter(tx -> tx.getOccurredAt() != null)
        .mapToDouble(tx -> Math.abs(tx.getAmount().doubleValue()))
        .sum();
    double projectedNext30 = Math.round((total30 / 30) * 30 * 100) / 100.0;

    var quickInsightTransactions = transactionService.listForUser(user.getId()).stream().limit(10)
            .map(tx -> new TransactionSummary(
                tx.getDescription() != null ? tx.getDescription() : "Transaction",
                Math.abs(tx.getAmount().doubleValue()),
                tx.getCategory() != null ? tx.getCategory().getName() : null
            ))
            .toList();

    String quickInsight = insightsService.getOverviewInsights(user.getId(), quickInsightTransactions);
    List<InsightCard> quickInsightCards = insightsService.getOverviewInsightCards(user.getId(), quickInsightTransactions);

    // Budget alerts: for each budget, compare spent vs limit (case-insensitive category match)
    Map<String, Double> byCategoryLower = byCategory.entrySet().stream()
        .collect(Collectors.toMap(e -> e.getKey().toLowerCase(), Map.Entry::getValue, (a, b) -> a));
    List<BudgetAlert> budgetAlerts = new ArrayList<>();
    for (Budget b : budgetService.listForUser(user.getId())) {
      double limit = b.getLimitAmount().doubleValue();
      double spent = "total".equalsIgnoreCase(b.getCategoryName().trim())
          ? spendingThisMonth
          : byCategoryLower.getOrDefault(b.getCategoryName().toLowerCase(), 0.0);
      int percent = limit > 0 ? (int) Math.round((spent / limit) * 100) : 0;
      String status = percent > 100 ? "over" : percent >= 80 ? "warning" : "ok";
      budgetAlerts.add(new BudgetAlert(
          b.getCategoryName(),
          Math.round(limit * 100) / 100.0,
          Math.round(spent * 100) / 100.0,
          percent,
          status
      ));
    }

    return new DashboardResponse(
        Math.round(spendingThisMonth * 100) / 100.0,
        categoryBreakdown,
        weeklySpending,
        recent,
        projectedNext30,
        quickInsight,
        quickInsightCards,
        budgetAlerts
    );
  }

  @GetMapping("/forecast")
  public ForecastResponse getForecast(@AuthenticationPrincipal User user) {
    Instant end = Instant.now();
    Instant start = end.minus(30, ChronoUnit.DAYS);
    var txs = transactionService.listForUserBetween(user.getId(), start, end);
    Map<LocalDate, Double> byDay = txs.stream()
        .collect(Collectors.groupingBy(
            tx -> tx.getOccurredAt().atZone(ZoneOffset.UTC).toLocalDate(),
            Collectors.summingDouble(tx -> Math.abs(tx.getAmount().doubleValue()))
        ));
    List<LocalDate> last7 = LocalDate.now(ZoneOffset.UTC).minusDays(6).datesUntil(LocalDate.now(ZoneOffset.UTC).plusDays(1)).toList();
    List<ForecastPoint> chartData = new ArrayList<>();
    for (int i = 0; i < last7.size(); i++) {
      double y = byDay.getOrDefault(last7.get(i), 0.0);
      chartData.add(new ForecastPoint(i + 1, Math.round(y * 100) / 100.0));
    }
    double total = byDay.values().stream().mapToDouble(Double::doubleValue).sum();
    double avgDaily = total / 30;
    double projectedNext30 = Math.round(avgDaily * 30 * 100) / 100.0;
    return new ForecastResponse(chartData, projectedNext30);
  }

  @PostMapping("/chat")
  public InsightsResponse chat(@AuthenticationPrincipal User user, @RequestBody ChatRequest request) {
    List<TransactionSummary> transactions = null;
    Long userId = user.getId();
    if (request.userId() != null && !request.userId().equals(userId)) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
    }
    if (userId != null) {
      transactions = transactionService.listForUser(userId).stream()
          .limit(20)
          .map(tx -> new TransactionSummary(
              tx.getDescription() != null ? tx.getDescription() : "Unknown",
              Math.abs(tx.getAmount().doubleValue()),
              tx.getCategory() != null ? tx.getCategory().getName() : null
          ))
          .toList();
    }
    String text = insightsService.chat(request.message(), userId, transactions);
    return new InsightsResponse(text);
  }

  @GetMapping("/analytics")
  public AnalyticsResponse getAnalytics(
      @AuthenticationPrincipal User user,
      @RequestParam(value = "range", defaultValue = "month") String range) {
    Long userId = user.getId();
    Instant now = Instant.now();
    Instant start;
    List<WeekAmount> spendingByWeek;
    var txs = switch (range) {
      case "week" -> {
        start = now.minus(7, ChronoUnit.DAYS);
        var list = transactionService.listForUserBetween(userId, start, now);
        spendingByWeek = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
          LocalDate d = LocalDate.now(ZoneOffset.UTC).minusDays(6 - i);
          Instant dayStart = d.atStartOfDay(ZoneOffset.UTC).toInstant();
          Instant dayEnd = d.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
          double sum = list.stream()
              .filter(tx -> tx.getOccurredAt() != null
                  && !tx.getOccurredAt().isBefore(dayStart)
                  && tx.getOccurredAt().isBefore(dayEnd))
              .mapToDouble(tx -> Math.abs(tx.getAmount().doubleValue()))
              .sum();
          spendingByWeek.add(new WeekAmount(d.format(DateTimeFormatter.ofPattern("EEE")), Math.round(sum * 100) / 100.0));
        }
        yield list;
      }
      case "3months" -> {
        start = now.minus(90, ChronoUnit.DAYS);
        var list = transactionService.listForUserBetween(userId, start, now);
        spendingByWeek = buildWeeklySpending(list, 13);
        yield list;
      }
      default -> {
        start = now.minus(30, ChronoUnit.DAYS);
        var list = transactionService.listForUserBetween(userId, start, now);
        spendingByWeek = buildWeeklySpending(list, 5);
        yield list;
      }
    };

    // Category breakdown with percent
    double total = txs.stream().mapToDouble(tx -> Math.abs(tx.getAmount().doubleValue())).sum();
    var byCategory = txs.stream()
        .filter(tx -> tx.getOccurredAt() != null)
        .collect(Collectors.groupingBy(
            tx -> tx.getCategory() != null ? tx.getCategory().getName() : "Other",
            Collectors.summingDouble(tx -> Math.abs(tx.getAmount().doubleValue()))
        ));
    List<CategoryWithPercent> categoryBreakdown = byCategory.entrySet().stream()
        .map(e -> new CategoryWithPercent(e.getKey(), e.getValue(), total > 0 ? (int) Math.round((e.getValue() / total) * 100) : 0))
        .sorted(Comparator.<CategoryWithPercent>comparingDouble(c -> c.amount()).reversed())
        .toList();

    // Month-over-month comparison
    LocalDate thisMonthStart = LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1);
    LocalDate lastMonthStart = thisMonthStart.minusMonths(1);
    Instant thisMonthStartInstant = thisMonthStart.atStartOfDay(ZoneOffset.UTC).toInstant();
    Instant lastMonthStartInstant = lastMonthStart.atStartOfDay(ZoneOffset.UTC).toInstant();
    Instant lastMonthEndInstant = thisMonthStartInstant;

    double thisMonthTotal = transactionService.listForUserBetween(userId, thisMonthStartInstant, now).stream()
        .filter(tx -> tx.getOccurredAt() != null)
        .mapToDouble(tx -> Math.abs(tx.getAmount().doubleValue()))
        .sum();
    double lastMonthTotal = transactionService.listForUserBetween(userId, lastMonthStartInstant, lastMonthEndInstant).stream()
        .filter(tx -> tx.getOccurredAt() != null)
        .mapToDouble(tx -> Math.abs(tx.getAmount().doubleValue()))
        .sum();

    double changePercent = lastMonthTotal > 0
        ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
        : (thisMonthTotal > 0 ? 100 : 0);

    // Top merchants by total spent
    List<MerchantAmount> topMerchants = txs.stream()
        .filter(tx -> tx.getDescription() != null && !tx.getDescription().isBlank())
        .collect(Collectors.groupingBy(
            tx -> tx.getDescription().trim().toLowerCase(),
            Collectors.summingDouble(tx -> Math.abs(tx.getAmount().doubleValue()))
        ))
        .entrySet().stream()
        .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
        .limit(10)
        .map(e -> new MerchantAmount(
            e.getKey().substring(0, Math.min(30, e.getKey().length())) + (e.getKey().length() > 30 ? "…" : ""),
            Math.round(e.getValue() * 100) / 100.0))
        .toList();

    return new AnalyticsResponse(
        spendingByWeek,
        categoryBreakdown,
        new MonthComparison(Math.round(thisMonthTotal * 100) / 100.0, Math.round(lastMonthTotal * 100) / 100.0, changePercent),
        topMerchants,
        Math.round(total * 100) / 100.0
    );
  }

  @GetMapping("/recurring")
  public RecurringResponse getRecurring(@AuthenticationPrincipal User user) {
    Long userId = user.getId();
    var items = recurringDetectionService.detect(userId);
    return new RecurringResponse(items);
  }

  @GetMapping("/optimizations")
  public InsightsResponse getOptimizations(@AuthenticationPrincipal User user) {
    var transactions = transactionService.listForUser(user.getId()).stream()
        .limit(30)
        .map(tx -> new TransactionSummary(
            tx.getDescription() != null ? tx.getDescription() : "Unknown",
            Math.abs(tx.getAmount().doubleValue()),
            tx.getCategory() != null ? tx.getCategory().getName() : null
        ))
        .toList();
    String text = insightsService.getOptimizationTips(transactions);
    return new InsightsResponse(text);
  }

  public record TransactionSuggestionsRequest(String description, double amount, String category) {}
  public record ChatRequest(String message, Long userId) {}
  public record InsightsResponse(String text, List<InsightCard> cards) {
    public InsightsResponse(String text) {
      this(text, List.of());
    }
  }
  public record RecurringResponse(List<RecurringDetectionService.RecurringItem> items) {}
  public record ForecastPoint(int x, double y) {}
  public record ForecastResponse(List<ForecastPoint> chartData, double projectedNext30) {}

  public record CategoryAmount(String category, double amount) {}
  public record DayAmount(String day, double amount) {}
  public record RecentTransaction(String description, double amount, String category) {}

  public record WeekAmount(String week, double amount) {}
  public record CategoryWithPercent(String category, double amount, int percent) {}
  public record MonthComparison(double thisMonth, double lastMonth, double changePercent) {}
  public record MerchantAmount(String merchant, double amount) {}
  private List<WeekAmount> buildWeeklySpending(List<Transaction> txs, int weeksToShow) {
    Map<LocalDate, Double> byWeekStart = new LinkedHashMap<>();
    for (int i = weeksToShow - 1; i >= 0; i--) {
      LocalDate weekStart = LocalDate.now(ZoneOffset.UTC).minusWeeks(i).with(java.time.DayOfWeek.MONDAY);
      if (weekStart.isAfter(LocalDate.now(ZoneOffset.UTC))) continue;
      LocalDate weekEnd = weekStart.plusDays(7);
      Instant weekStartInstant = weekStart.atStartOfDay(ZoneOffset.UTC).toInstant();
      Instant weekEndInstant = weekEnd.atStartOfDay(ZoneOffset.UTC).toInstant();
      double sum = txs.stream()
          .filter(tx -> tx.getOccurredAt() != null
              && !tx.getOccurredAt().isBefore(weekStartInstant)
              && tx.getOccurredAt().isBefore(weekEndInstant))
          .mapToDouble(tx -> Math.abs(tx.getAmount().doubleValue()))
          .sum();
      byWeekStart.put(weekStart, Math.round(sum * 100) / 100.0);
    }
    return byWeekStart.entrySet().stream()
        .map(e -> new WeekAmount(e.getKey().format(DateTimeFormatter.ofPattern("MMM d")), e.getValue()))
        .toList();
  }

  public record AnalyticsResponse(
      List<WeekAmount> spendingByWeek,
      List<CategoryWithPercent> categoryBreakdown,
      MonthComparison monthOverMonth,
      List<MerchantAmount> topMerchants,
      double totalSpent
  ) {}
  public record BudgetAlert(String category, double limit, double spent, int percent, String status) {}
  public record DashboardResponse(
      double spendingThisMonth,
      List<CategoryAmount> categoryBreakdown,
      List<DayAmount> weeklySpending,
      List<RecentTransaction> recentTransactions,
      double projectedNext30,
      String quickInsight,
      List<InsightCard> quickInsightCards,
      List<BudgetAlert> budgetAlerts
  ) {}
}
