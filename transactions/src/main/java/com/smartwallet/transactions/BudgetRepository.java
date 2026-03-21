package com.smartwallet.transactions;

import com.smartwallet.core.domain.Budget;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BudgetRepository extends JpaRepository<Budget, Long> {
  List<Budget> findByUserIdOrderByCategoryNameAsc(Long userId);

  Optional<Budget> findByUserIdAndCategoryNameIgnoreCase(Long userId, String categoryName);
}
