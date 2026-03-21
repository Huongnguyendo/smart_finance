package com.smartwallet.rabbitmq;

import com.smartwallet.ml.service.MlCategorySuggestionService;
import com.smartwallet.transactions.event.TransactionCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!integration")
public class TransactionCreatedListener {

  private static final Logger log = LoggerFactory.getLogger(TransactionCreatedListener.class);
  private final MlCategorySuggestionService mlCategorySuggestionService;

  public TransactionCreatedListener(MlCategorySuggestionService mlCategorySuggestionService) {
    this.mlCategorySuggestionService = mlCategorySuggestionService;
  }

  @RabbitListener(queues = RabbitConfig.QUEUE_TRANSACTION_CREATED)
  public void consume(TransactionCreatedEvent event) {
    log.info("Consumed transaction.created: txId={} userId={}", event.transactionId(), event.userId());
    mlCategorySuggestionService.invalidateCache(event.userId());
    // TODO: trigger async insight generation, analytics, etc.
  }
}
