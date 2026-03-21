package com.smartwallet;

import com.smartwallet.core.domain.Transaction;
import com.smartwallet.core.domain.User;
import com.smartwallet.transactions.event.TransactionCreatedEvent;
import com.smartwallet.transactions.event.TransactionEventPublisher;
import com.smartwallet.transactions.service.TransactionService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * One-click demo data seeding for new users.
 */
@RestController
@RequestMapping("/api/demo")
public class DemoController {

  private static final Logger log = LoggerFactory.getLogger(DemoController.class);

  private final TransactionService transactionService;
  private final TransactionEventPublisher eventPublisher;

  public DemoController(TransactionService transactionService,
      TransactionEventPublisher eventPublisher) {
    this.transactionService = transactionService;
    this.eventPublisher = eventPublisher;
  }

  @PostMapping("/seed")
  public DemoSeedResponse seed(@AuthenticationPrincipal User user) {
    Instant now = Instant.now();

    // Demo transactions: description, amount, category, daysAgo (for recurring detection)
    record DemoRow(String desc, double amount, String category, int daysAgo) {}
    List<DemoRow> rows = List.of(
        new DemoRow("Starbucks coffee", 5.99, "Food", 0),
        new DemoRow("McDonald's lunch", 12.50, "Food", 0),
        new DemoRow("Whole Foods groceries", 85.23, "Grocery", 0),
        new DemoRow("Uber ride", 45.00, "Transport", 0),
        new DemoRow("Shell gas station", 52.00, "Transport", 0),
        new DemoRow("Lyft downtown", 18.75, "Transport", 0),
        new DemoRow("Netflix subscription", 15.99, "Entertainment", 0),
        new DemoRow("Netflix subscription", 15.99, "Entertainment", 30),
        new DemoRow("Netflix subscription", 15.99, "Entertainment", 60),
        new DemoRow("Spotify premium", 9.99, "Entertainment", 0),
        new DemoRow("Spotify premium", 9.99, "Entertainment", 30),
        new DemoRow("Spotify premium", 9.99, "Entertainment", 60),
        new DemoRow("AMC movie tickets", 24.00, "Entertainment", 0),
        new DemoRow("Amazon Prime", 14.99, "Shopping", 0),
        new DemoRow("Amazon Prime", 14.99, "Shopping", 30),
        new DemoRow("Target household items", 67.45, "Shopping", 0),
        new DemoRow("Walmart groceries", 92.30, "Grocery", 0),
        new DemoRow("Electric bill", 125.00, "Bills", 0),
        new DemoRow("Electric bill", 125.00, "Bills", 30),
        new DemoRow("Electric bill", 125.00, "Bills", 60),
        new DemoRow("Internet Comcast", 79.99, "Bills", 0),
        new DemoRow("Internet Comcast", 79.99, "Bills", 30),
        new DemoRow("Rent payment", 1200.00, "Bills", 0),
        new DemoRow("Rent payment", 1200.00, "Bills", 30),
        new DemoRow("Rent payment", 1200.00, "Bills", 60),
        new DemoRow("Starbucks latte", 6.50, "Food", 15),
        new DemoRow("Chipotle dinner", 14.25, "Food", 0),
        new DemoRow("Trader Joe's", 42.18, "Grocery", 0),
        new DemoRow("Uber Eats delivery", 28.90, "Food", 0),
        new DemoRow("Parking meter", 8.00, "Transport", 0),
        new DemoRow("Bus pass monthly", 65.00, "Transport", 0),
        new DemoRow("Bus pass monthly", 65.00, "Transport", 30),
        new DemoRow("Hulu subscription", 11.99, "Entertainment", 0),
        new DemoRow("Hulu subscription", 11.99, "Entertainment", 30),
        new DemoRow("Coffee shop", 4.75, "Food", 0),
        new DemoRow("Pizza Hut", 23.50, "Food", 0),
        new DemoRow("Grocery store", 58.00, "Grocery", 0)
    );

    int count = 0;
    for (DemoRow row : rows) {
      Transaction tx = new Transaction();
      tx.setUser(user);
      tx.setAmount(BigDecimal.valueOf(row.amount));
      tx.setDescription(row.desc);
      tx.setOccurredAt(now.minus(row.daysAgo, ChronoUnit.DAYS));
      tx.setCategory(null); // let service resolve or use categoryName
      Transaction saved = transactionService.create(tx, row.category);
      eventPublisher.publishTransactionCreated(
          new TransactionCreatedEvent(saved.getId(), user.getId()));
      count++;
    }

    log.info("Demo seed: created {} transactions for user {}", count, user.getId());
    return new DemoSeedResponse(count, "Demo data loaded successfully.");
  }

  public record DemoSeedResponse(int count, String message) {}
}
