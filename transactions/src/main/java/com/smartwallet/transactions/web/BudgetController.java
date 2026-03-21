package com.smartwallet.transactions.web;

import com.smartwallet.core.domain.Budget;
import com.smartwallet.core.domain.User;
import com.smartwallet.transactions.service.BudgetService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {
  private final BudgetService budgetService;

  public BudgetController(BudgetService budgetService) {
    this.budgetService = budgetService;
  }

  @GetMapping
  public List<BudgetResponse> list(@AuthenticationPrincipal User user) {
    return budgetService.listForUser(user.getId()).stream()
        .map(this::toResponse)
        .toList();
  }

  @PostMapping
  public BudgetResponse create(@AuthenticationPrincipal User user, @Valid @RequestBody BudgetRequest request) {
    if (!request.userId().equals(user.getId())) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
    }
    Budget budget = budgetService.create(
        request.userId(),
        request.categoryName(),
        request.limitAmount()
    );
    return toResponse(budget);
  }

  @PutMapping("/{id}")
  public BudgetResponse update(
      @AuthenticationPrincipal User user,
      @PathVariable Long id,
      @Valid @RequestBody BudgetUpdateRequest request) {
    if (!request.userId().equals(user.getId())) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
    }
    Budget budget = budgetService.update(id, user.getId(), request.limitAmount());
    return toResponse(budget);
  }

  @DeleteMapping("/{id}")
  public void delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
    budgetService.delete(id, user.getId());
  }

  private BudgetResponse toResponse(Budget b) {
    return new BudgetResponse(
        b.getId(),
        b.getUser().getId(),
        b.getCategoryName(),
        b.getLimitAmount().doubleValue(),
        b.getCreatedAt(),
        b.getUpdatedAt()
    );
  }

  public record BudgetRequest(Long userId, String categoryName, BigDecimal limitAmount) {}
  public record BudgetUpdateRequest(Long userId, BigDecimal limitAmount) {}
  public record BudgetResponse(Long id, Long userId, String categoryName, double limitAmount,
      java.time.Instant createdAt, java.time.Instant updatedAt) {}
}
