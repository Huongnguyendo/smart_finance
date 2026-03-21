package com.smartwallet.transactions.event;

/**
 * Event published when a transaction is created.
 * Consumed asynchronously for insight generation, analytics, etc.
 */
public record TransactionCreatedEvent(long transactionId, long userId) {}
