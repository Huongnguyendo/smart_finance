package com.smartwallet.transactions.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartwallet.core.domain.Budget;
import com.smartwallet.core.domain.User;
import com.smartwallet.transactions.BudgetRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class BudgetServiceTest {

  @Mock BudgetRepository budgetRepository;

  @Test
  void createSavesBudget() {
    when(budgetRepository.findByUserIdAndCategoryNameIgnoreCase(1L, "Food")).thenReturn(Optional.empty());
    when(budgetRepository.save(any(Budget.class))).thenAnswer(inv -> inv.getArgument(0));

    BudgetService service = new BudgetService(budgetRepository);
    Budget budget = service.create(1L, "Food", BigDecimal.valueOf(500));

    assertNotNull(budget);
    assertEquals("Food", budget.getCategoryName());
    assertEquals(BigDecimal.valueOf(500), budget.getLimitAmount());
    assertEquals(1L, budget.getUser().getId());
  }

  @Test
  void createThrowsWhenCategoryBlank() {
    BudgetService service = new BudgetService(budgetRepository);
    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.create(1L, "  ", BigDecimal.valueOf(500)));
    assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    assertEquals("Category name is required", ex.getReason());
  }

  @Test
  void createThrowsWhenLimitNotPositive() {
    BudgetService service = new BudgetService(budgetRepository);
    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.create(1L, "Food", BigDecimal.ZERO));
    assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    assertEquals("Limit must be positive", ex.getReason());
  }

  @Test
  void createThrowsWhenBudgetAlreadyExists() {
    Budget existing = new Budget();
    existing.setCategoryName("Food");
    when(budgetRepository.findByUserIdAndCategoryNameIgnoreCase(1L, "Food"))
        .thenReturn(Optional.of(existing));

    BudgetService service = new BudgetService(budgetRepository);
    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.create(1L, "Food", BigDecimal.valueOf(500)));
    assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    assertEquals("Budget for Food already exists", ex.getReason());
  }

  @Test
  void updateSavesBudget() {
    Budget budget = new Budget();
    budget.setId(1L);
    User user = new User();
    user.setId(1L);
    budget.setUser(user);
    budget.setCategoryName("Food");
    budget.setLimitAmount(BigDecimal.valueOf(400));

    when(budgetRepository.findById(1L)).thenReturn(Optional.of(budget));
    when(budgetRepository.save(any(Budget.class))).thenAnswer(inv -> inv.getArgument(0));

    BudgetService service = new BudgetService(budgetRepository);
    Budget updated = service.update(1L, 1L, BigDecimal.valueOf(600));

    assertEquals(BigDecimal.valueOf(600), updated.getLimitAmount());
  }

  @Test
  void updateThrowsWhenBudgetNotFound() {
    when(budgetRepository.findById(99L)).thenReturn(Optional.empty());
    BudgetService service = new BudgetService(budgetRepository);
    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.update(99L, 1L, BigDecimal.valueOf(500)));
    assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
  }

  @Test
  void updateThrowsWhenUserMismatch() {
    Budget budget = new Budget();
    budget.setId(1L);
    User user = new User();
    user.setId(2L);
    budget.setUser(user);
    when(budgetRepository.findById(1L)).thenReturn(Optional.of(budget));

    BudgetService service = new BudgetService(budgetRepository);
    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.update(1L, 1L, BigDecimal.valueOf(500)));
    assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    assertEquals("Not your budget", ex.getReason());
  }

  @Test
  void deleteRemovesBudget() {
    Budget budget = new Budget();
    budget.setId(1L);
    User user = new User();
    user.setId(1L);
    budget.setUser(user);
    when(budgetRepository.findById(1L)).thenReturn(Optional.of(budget));

    BudgetService service = new BudgetService(budgetRepository);
    service.delete(1L, 1L);

    verify(budgetRepository).delete(budget);
  }

  @Test
  void listForUserReturnsFromRepository() {
    List<Budget> budgets = List.of();
    when(budgetRepository.findByUserIdOrderByCategoryNameAsc(1L)).thenReturn(budgets);

    BudgetService service = new BudgetService(budgetRepository);
    assertEquals(budgets, service.listForUser(1L));
  }
}
