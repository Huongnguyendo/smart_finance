package com.smartwallet.rabbitmq;

import com.smartwallet.transactions.event.TransactionCreatedEvent;
import com.smartwallet.transactions.event.TransactionEventPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!integration")
@ConditionalOnProperty(prefix = "spring.rabbitmq", name = "enabled", havingValue = "true", matchIfMissing = true)
public class RabbitTransactionEventPublisher implements TransactionEventPublisher {

  private static final Logger log = LoggerFactory.getLogger(RabbitTransactionEventPublisher.class);

  private final RabbitTemplate rabbitTemplate;

  public RabbitTransactionEventPublisher(RabbitTemplate rabbitTemplate) {
    this.rabbitTemplate = rabbitTemplate;
  }

  @Override
  public void publishTransactionCreated(TransactionCreatedEvent event) {
    try {
      rabbitTemplate.convertAndSend(RabbitConfig.QUEUE_TRANSACTION_CREATED, event);
      log.info("Published transaction.created: txId={} userId={}", event.transactionId(), event.userId());
    } catch (Exception e) {
      log.warn("Failed to publish transaction.created: {}", e.getMessage());
    }
  }
}
