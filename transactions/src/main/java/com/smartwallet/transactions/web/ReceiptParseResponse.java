package com.smartwallet.transactions.web;

import java.math.BigDecimal;

public class ReceiptParseResponse {
  private String rawText;
  private BigDecimal amount;
  private String receiptUrl;
  private String merchant;

  public ReceiptParseResponse(String rawText, BigDecimal amount, String receiptUrl, String merchant) {
    this.rawText = rawText;
    this.amount = amount;
    this.receiptUrl = receiptUrl;
    this.merchant = merchant;
  }

  public String getRawText() {
    return rawText;
  }

  public BigDecimal getAmount() {
    return amount;
  }

  public String getReceiptUrl() {
    return receiptUrl;
  }

  public String getMerchant() {
    return merchant;
  }
}
