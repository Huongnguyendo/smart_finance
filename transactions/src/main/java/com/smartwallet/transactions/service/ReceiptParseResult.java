package com.smartwallet.transactions.service;

import java.math.BigDecimal;

public class ReceiptParseResult {
  private final String rawText;
  private final BigDecimal amount;
  private final String merchant;

  public ReceiptParseResult(String rawText, BigDecimal amount, String merchant) {
    this.rawText = rawText;
    this.amount = amount;
    this.merchant = merchant;
  }

  public String getRawText() {
    return rawText;
  }

  public BigDecimal getAmount() {
    return amount;
  }

  public String getMerchant() {
    return merchant;
  }
}
