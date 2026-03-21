package com.smartwallet.core.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

/**
 * Suggests a category for a transaction based on user history.
 * Implementations may use ML, rules, or external APIs (e.g. Groq).
 */
public interface CategorySuggestionService {

  /**
   * Suggests a category name for a transaction.
   *
   * @param userId      the user
   * @param description transaction description (merchant, notes)
   * @param amount      transaction amount
   * @param occurredAt  when the transaction occurred
   * @param receiptText optional full OCR text from receipt (items, etc.) for context
   * @return suggested category name, or empty if no suggestion
   */
  Optional<CategorySuggestion> suggest(Long userId, String description, BigDecimal amount, Instant occurredAt, String receiptText);

  record CategorySuggestion(String categoryName, double confidence) {}
}
