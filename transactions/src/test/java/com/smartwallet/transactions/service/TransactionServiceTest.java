package com.smartwallet.transactions.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartwallet.core.domain.Category;
import com.smartwallet.core.domain.Transaction;
import com.smartwallet.core.domain.User;
import com.smartwallet.transactions.CategoryRepository;
import com.smartwallet.transactions.TransactionRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

  @Mock TransactionRepository transactionRepository;
  @Mock CategoryRepository categoryRepository;

  @Test
  void createSetsOccurredAtAndCategory() {
    when(categoryRepository.findByNameIgnoreCase(anyString())).thenReturn(Optional.empty());
    Category cat = new Category();
    cat.setName("Food");
    when(categoryRepository.save(any(Category.class))).thenReturn(cat);
    when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

    Transaction tx = new Transaction();
    tx.setUser(new User());
    tx.setAmount(new BigDecimal("10.00"));

    TransactionService service = new TransactionService(transactionRepository, categoryRepository, null);
    Transaction saved = service.create(tx, "Food");

    assertNotNull(saved.getOccurredAt());
    assertEquals("Food", saved.getCategory().getName());
  }

  @Test
  void getThrowsWhenNotFound() {
    when(transactionRepository.findById(99L)).thenReturn(Optional.empty());
    TransactionService service = new TransactionService(transactionRepository, categoryRepository, null);
    ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.get(99L));
    assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
  }

  @Test
  void listForUserDelegatesToRepository() {
    List<Transaction> txs = List.of();
    when(transactionRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(txs);
    TransactionService service = new TransactionService(transactionRepository, categoryRepository, null);
    assertEquals(txs, service.listForUser(1L));
  }

  @Test
  void deleteDelegatesToRepository() {
    TransactionService service = new TransactionService(transactionRepository, categoryRepository, null);
    service.delete(1L);
    verify(transactionRepository).deleteById(1L);
  }
}
