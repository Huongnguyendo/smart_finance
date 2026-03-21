package com.smartwallet.insights.service;

import com.smartwallet.core.domain.Transaction;
import com.smartwallet.transactions.service.TransactionService;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * Detects recurring transactions (subscriptions, bills) from spending patterns.
 */
@Service
public class RecurringDetectionService {

  private static final int LOOKBACK_DAYS = 180;
  private static final int MIN_OCCURRENCES = 2;
  private static final double AMOUNT_TOLERANCE = 0.15; // 15% variance allowed
  private static final int MONTHLY_DAYS_MIN = 25;
  private static final int MONTHLY_DAYS_MAX = 35;
  private static final int WEEKLY_DAYS_MIN = 5;
  private static final int WEEKLY_DAYS_MAX = 10;
  private static final int BIWEEKLY_DAYS_MIN = 12;
  private static final int BIWEEKLY_DAYS_MAX = 16;

  private final TransactionService transactionService;

  public RecurringDetectionService(TransactionService transactionService) {
    this.transactionService = transactionService;
  }

  public List<RecurringItem> detect(Long userId) {
    Instant end = Instant.now();
    Instant start = end.minus(LOOKBACK_DAYS, ChronoUnit.DAYS);
    List<Transaction> txs = transactionService.listForUserBetween(userId, start, end);

    // Group by normalized merchant (description)
    Map<String, List<Transaction>> byMerchant = txs.stream()
        .filter(t -> t.getDescription() != null && !t.getDescription().isBlank())
        .filter(t -> t.getOccurredAt() != null)
        .collect(Collectors.groupingBy(
            t -> normalizeMerchant(t.getDescription()),
            LinkedHashMap::new,
            Collectors.toList()
        ));

    List<RecurringItem> result = new ArrayList<>();
    for (Map.Entry<String, List<Transaction>> e : byMerchant.entrySet()) {
      List<Transaction> group = e.getValue();
      if (group.size() < MIN_OCCURRENCES) continue;

      group.sort(Comparator.comparing(Transaction::getOccurredAt));

      double avgAmount = group.stream()
          .mapToDouble(t -> Math.abs(t.getAmount().doubleValue()))
          .average()
          .orElse(0);
      if (avgAmount <= 0) continue;

      // Check amount consistency
      boolean amountsConsistent = group.stream()
          .allMatch(t -> {
            double a = Math.abs(t.getAmount().doubleValue());
            return Math.abs(a - avgAmount) / avgAmount <= AMOUNT_TOLERANCE;
          });
      if (!amountsConsistent) continue;

      // Compute intervals between consecutive transactions
      List<Long> intervals = new ArrayList<>();
      for (int i = 1; i < group.size(); i++) {
        long days = ChronoUnit.DAYS.between(
            group.get(i - 1).getOccurredAt(),
            group.get(i).getOccurredAt()
        );
        if (days > 0) intervals.add(days);
      }
      if (intervals.isEmpty()) continue;

      double avgInterval = intervals.stream().mapToLong(Long::longValue).average().orElse(0);
      String frequency = inferFrequency(avgInterval);
      if (frequency == null) continue;

      // Use first merchant name from group for display
      String displayName = group.get(0).getDescription().trim();
      if (displayName.length() > 40) {
        displayName = displayName.substring(0, 37) + "...";
      }

      double confidence = Math.min(0.95, 0.6 + (group.size() * 0.1) + (amountsConsistent ? 0.1 : 0));
      result.add(new RecurringItem(
          displayName,
          Math.round(avgAmount * 100) / 100.0,
          frequency,
          group.size(),
          group.get(group.size() - 1).getOccurredAt(),
          confidence
      ));
    }

    result.sort(Comparator.comparingDouble(RecurringItem::amount).reversed());
    return result;
  }

  private String normalizeMerchant(String desc) {
    return desc.trim().toLowerCase()
        .replaceAll("\\s+#\\d+.*$", "")  // "Starbucks #1234" -> "starbucks"
        .replaceAll("\\.(com|net|org).*$", "")  // "netflix.com" -> "netflix"
        .replaceAll("\\s+", " ")
        .replaceAll("[^a-z0-9\\s]", "")
        .trim();
  }

  private String inferFrequency(double avgDays) {
    if (avgDays >= WEEKLY_DAYS_MIN && avgDays <= WEEKLY_DAYS_MAX) return "weekly";
    if (avgDays >= BIWEEKLY_DAYS_MIN && avgDays <= BIWEEKLY_DAYS_MAX) return "biweekly";
    if (avgDays >= MONTHLY_DAYS_MIN && avgDays <= MONTHLY_DAYS_MAX) return "monthly";
    return null;
  }

  public record RecurringItem(
      String merchant,
      double amount,
      String frequency,
      int occurrenceCount,
      Instant lastOccurredAt,
      double confidence
  ) {}
}
