package com.smartwallet.transactions.web;

import java.math.BigDecimal;
import java.time.Instant;

public class TransactionResponse {
  private Long id;
  private Long userId;
  private BigDecimal amount;
  private String description;
  private String category;
  private Instant date;
  private String receiptUrl;
  private Instant createdAt;
  private Instant updatedAt;

  public TransactionResponse(
      Long id,
      Long userId,
      BigDecimal amount,
      String description,
      String category,
      Instant date,
      String receiptUrl,
      Instant createdAt,
      Instant updatedAt) {
    this.id = id;
    this.userId = userId;
    this.amount = amount;
    this.description = description;
    this.category = category;
    this.date = date;
    this.receiptUrl = receiptUrl;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public Long getId() {
    return id;
  }

  public Long getUserId() {
    return userId;
  }

  public BigDecimal getAmount() {
    return amount;
  }

  public String getDescription() {
    return description;
  }

  public String getCategory() {
    return category;
  }

  public Instant getDate() {
    return date;
  }

  public String getReceiptUrl() {
    return receiptUrl;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
