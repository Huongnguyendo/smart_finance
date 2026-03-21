package com.smartwallet.admin;

import com.smartwallet.auth.UserRepository;
import com.smartwallet.transactions.BudgetRepository;
import com.smartwallet.transactions.TransactionRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin", description = "Admin-only platform metrics (requires ADMIN role)")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

  private final UserRepository userRepository;
  private final TransactionRepository transactionRepository;
  private final BudgetRepository budgetRepository;

  public AdminController(
      UserRepository userRepository,
      TransactionRepository transactionRepository,
      BudgetRepository budgetRepository) {
    this.userRepository = userRepository;
    this.transactionRepository = transactionRepository;
    this.budgetRepository = budgetRepository;
  }

  @GetMapping("/overview")
  @Operation(summary = "Aggregate counts for monitoring (admin only)")
  public AdminOverviewResponse overview() {
    return new AdminOverviewResponse(
        userRepository.count(),
        transactionRepository.count(),
        budgetRepository.count());
  }
}
