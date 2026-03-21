package com.smartwallet.transactions.service;

import com.smartwallet.core.domain.Budget;
import com.smartwallet.core.domain.User;
import com.smartwallet.transactions.BudgetRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BudgetService {
  private final BudgetRepository budgetRepository;

  public BudgetService(BudgetRepository budgetRepository) {
    this.budgetRepository = budgetRepository;
  }

  public List<Budget> listForUser(Long userId) {
    return budgetRepository.findByUserIdOrderByCategoryNameAsc(userId);
  }

  public Budget create(Long userId, String categoryName, BigDecimal limitAmount) {
    if (categoryName == null || categoryName.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category name is required");
    }
    if (limitAmount == null || limitAmount.compareTo(BigDecimal.ZERO) <= 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Limit must be positive");
    }
    var existing = budgetRepository.findByUserIdAndCategoryNameIgnoreCase(userId, categoryName);
    if (existing.isPresent()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Budget for " + categoryName + " already exists");
    }
    Budget budget = new Budget();
    budget.setUser(userRef(userId));
    budget.setCategoryName(categoryName.trim());
    budget.setLimitAmount(limitAmount);
    return budgetRepository.save(budget);
  }

  public Budget update(Long id, Long userId, BigDecimal limitAmount) {
    Budget budget = budgetRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Budget not found"));
    if (!budget.getUser().getId().equals(userId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your budget");
    }
    if (limitAmount != null && limitAmount.compareTo(BigDecimal.ZERO) > 0) {
      budget.setLimitAmount(limitAmount);
    }
    budget.setUpdatedAt(Instant.now());
    return budgetRepository.save(budget);
  }

  public void delete(Long id, Long userId) {
    Budget budget = budgetRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Budget not found"));
    if (!budget.getUser().getId().equals(userId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your budget");
    }
    budgetRepository.delete(budget);
  }

  private User userRef(Long userId) {
    User user = new User();
    user.setId(userId);
    return user;
  }
}
