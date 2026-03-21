package com.smartwallet.transactions;

import com.smartwallet.core.domain.Transaction;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
  List<Transaction> findByUserIdOrderByCreatedAtDesc(Long userId);
  Page<Transaction> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
  List<Transaction> findByUserIdAndOccurredAtBetweenOrderByOccurredAtAsc(Long userId, Instant start, Instant end);
  List<Transaction> findByUserIdAndCategoryIsNotNullOrderByCreatedAtDesc(Long userId);
  boolean existsByUserIdAndReceiptUrlContaining(Long userId, String filename);

  @Query("SELECT t FROM Transaction t LEFT JOIN t.category c WHERE t.user.id = :userId "
      + "AND (:search = '' OR LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%')) "
      + "     OR (c IS NOT NULL AND LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')))) "
      + "AND (:category = '' OR (c IS NOT NULL AND LOWER(c.name) = LOWER(:category)))")
  Page<Transaction> findByUserIdWithFilters(
      @Param("userId") Long userId,
      @Param("search") String search,
      @Param("category") String category,
      Pageable pageable);

  @Query("SELECT DISTINCT c.name FROM Transaction t JOIN t.category c WHERE t.user.id = :userId ORDER BY c.name")
  List<String> findDistinctCategoryNamesByUserId(@Param("userId") Long userId);
}
