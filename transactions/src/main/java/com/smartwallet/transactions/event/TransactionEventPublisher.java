package com.smartwallet.transactions.event;

/**
 * Publishes transaction events (e.g. to Kafka) for async processing.
 */
public interface TransactionEventPublisher {

  void publishTransactionCreated(TransactionCreatedEvent event);
}
