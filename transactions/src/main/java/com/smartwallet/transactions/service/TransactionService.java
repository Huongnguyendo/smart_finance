package com.smartwallet.transactions.service;

import com.smartwallet.core.domain.Category;
import com.smartwallet.core.domain.Transaction;
import com.smartwallet.core.domain.User;
import com.smartwallet.core.service.CategorySuggestionService;
import com.smartwallet.transactions.CategoryRepository;
import com.smartwallet.transactions.TransactionRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TransactionService {
  private final TransactionRepository transactionRepository;
  private final CategoryRepository categoryRepository;
  private final Optional<CategorySuggestionService> categorySuggestionService;

  public TransactionService(
      TransactionRepository transactionRepository,
      CategoryRepository categoryRepository,
      @Autowired(required = false) CategorySuggestionService categorySuggestionService) {
    this.transactionRepository = transactionRepository;
    this.categoryRepository = categoryRepository;
    this.categorySuggestionService = Optional.ofNullable(categorySuggestionService);
  }

  public Transaction create(Transaction transaction, String categoryName) {
    if (categoryName == null || categoryName.isBlank()) {
      categoryName = categorySuggestionService
          .flatMap(s -> s.suggest(
              transaction.getUser().getId(),
              transaction.getDescription(),
              transaction.getAmount(),
              transaction.getOccurredAt() != null ? transaction.getOccurredAt() : Instant.now(),
              null))
          .map(CategorySuggestionService.CategorySuggestion::categoryName)
          .orElse(null);
    }
    transaction.setCategory(resolveCategory(categoryName));
    if (transaction.getOccurredAt() == null) {
      transaction.setOccurredAt(Instant.now());
    }
    return transactionRepository.save(transaction);
  }

  public Transaction update(Long id, Transaction updates, String categoryName) {
    Transaction existing = transactionRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
    existing.setAmount(updates.getAmount());
    existing.setDescription(updates.getDescription());
    existing.setOccurredAt(updates.getOccurredAt());
    existing.setReceiptUrl(updates.getReceiptUrl());
    existing.setCategory(resolveCategory(categoryName));
    existing.setUpdatedAt(Instant.now());
    return transactionRepository.save(existing);
  }

  public Transaction get(Long id) {
    return transactionRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
  }

  public List<Transaction> listForUser(Long userId) {
    return transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
  }

  public Page<Transaction> listForUser(Long userId, Pageable pageable) {
    return transactionRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
  }

  public Page<Transaction> listForUserWithFilters(Long userId, String search, String category, Pageable pageable) {
    String searchParam = (search != null && !search.isBlank()) ? search.trim() : "";
    String categoryParam = (category != null && !category.isBlank()) ? category.trim() : "";
    return transactionRepository.findByUserIdWithFilters(userId, searchParam, categoryParam, pageable);
  }

  public List<String> listCategoryNamesForUser(Long userId) {
    return transactionRepository.findDistinctCategoryNamesByUserId(userId);
  }

  public List<Transaction> listForUserBetween(Long userId, Instant start, Instant end) {
    return transactionRepository.findByUserIdAndOccurredAtBetweenOrderByOccurredAtAsc(userId, start, end);
  }

  public void delete(Long id) {
    transactionRepository.deleteById(id);
  }

  /**
   * Returns true if the given receipt filename is linked to a transaction owned by the user.
   * Used to enforce receipt ownership before serving the file.
   */
  public boolean isReceiptOwnedByUser(Long userId, String filename) {
    if (filename == null || filename.isBlank()) return false;
    if (!filename.matches("[a-zA-Z0-9_.-]+")) return false;
    return transactionRepository.existsByUserIdAndReceiptUrlContaining(userId, filename);
  }

  /**
   * Suggests a category for a transaction based on ML or other heuristics.
   * Returns empty when no suggestion is available (e.g. insufficient training data).
   */
  public Optional<CategorySuggestionService.CategorySuggestion> suggestCategory(
      Long userId, String description, java.math.BigDecimal amount, java.time.Instant occurredAt, String receiptText) {
    return categorySuggestionService.flatMap(s ->
        s.suggest(userId, description, amount, occurredAt != null ? occurredAt : Instant.now(), receiptText));
  }

  public Transaction buildTransaction(User user) {
    Transaction tx = new Transaction();
    tx.setUser(user);
    return tx;
  }

  private Category resolveCategory(String name) {
    if (name == null || name.isBlank()) {
      return null;
    }
    return categoryRepository.findByNameIgnoreCase(name)
        .orElseGet(() -> {
          Category category = new Category();
          category.setName(name.trim());
          return categoryRepository.save(category);
        });
  }
}
