import { MessageConfig } from './types/message.interface';

export interface RabbitMQConfig extends MessageConfig {
  exchangeType?:
    | 'topic'
    | 'direct'
    | 'fanout'
    | 'headers'
    | 'x-message-deduplication';
  strategyKey?: string;
  exchangeArguments?: Record<string, number | string | boolean>;
  /** Se true, este serviço consome desta fila. Se false, só publica (não registra consumer). */
  isConsumer?: boolean;
}

export const rabbitMQConfig: Record<string, RabbitMQConfig> = {
  // Fila para enviar OS para produção quando aprovada (só publica, não consome)
  sendToProduction: {
    exchange: 'workorder.v1',
    queue: 'workorder.v1.send-to-production',
    routingKey: 'send-to-production',
    deadLetterExchange: 'workorder.v1.dlq',
    deadLetterRoutingKey: 'send-to-production.dlq',
    strategyKey: 'sendToProduction',
    isConsumer: false,
  },
  // Fila para receber atualizações de status da produção
  productionStatusUpdate: {
    exchange: 'production.v1',
    queue: 'production.v1.status-update',
    routingKey: 'status-update',
    deadLetterExchange: 'production.v1.dlq',
    deadLetterRoutingKey: 'status-update.dlq',
    strategyKey: 'productionStatusUpdate',
    isConsumer: true,
  },

  sagaPublish: {
    exchange: 'saga.v1',
    queue: 'saga.v1.order.publish',
    routingKey: 'saga.publish',
    deadLetterExchange: 'saga.v1.dlq',
    deadLetterRoutingKey: 'saga.publish.dlq',
    isConsumer: false,
  },
  sagaWorkOrderCreated: {
    exchange: 'saga.v1',
    queue: 'saga.v1.order.created',
    routingKey: 'work_order.created',
    deadLetterExchange: 'saga.v1.dlq',
    deadLetterRoutingKey: 'order.created.dlq',
    strategyKey: 'sagaWorkOrderCreated',
    isConsumer: true,
  },
  sagaWorkOrderBudgetGenerated: {
    exchange: 'saga.v1',
    queue: 'saga.v1.order.budget_generated',
    routingKey: 'work_order.budget_generated',
    deadLetterExchange: 'saga.v1.dlq',
    deadLetterRoutingKey: 'order.budget_generated.dlq',
    strategyKey: 'sagaWorkOrderBudgetGenerated',
    isConsumer: true,
  },
  sagaCompensateOrder: {
    exchange: 'saga.v1',
    queue: 'saga.v1.compensate.order',
    routingKey: 'compensate',
    deadLetterExchange: 'saga.v1.dlq',
    deadLetterRoutingKey: 'compensate.order.dlq',
    strategyKey: 'sagaCompensateOrder',
    isConsumer: true,
  },
  sendEmail: {
    exchange: 'email.v1',
    queue: 'email.v1.send',
    routingKey: 'send',
    deadLetterExchange: 'email.v1.dlq',
    deadLetterRoutingKey: 'send.dlq',
    isConsumer: false,
  },
  paymentApproved: {
    exchange: 'payment.v1',
    queue: 'payment.v1.approved',
    routingKey: 'payment.approved',
    deadLetterExchange: 'payment.v1.dlq',
    deadLetterRoutingKey: 'payment.approved.dlq',
    strategyKey: 'paymentApproved',
    isConsumer: true,
  },
  // Publicar requisição de pagamento (ORDER -> PAYMENT)
  paymentRequested: {
    exchange: 'payment.v1',
    queue: 'payment.v1.requested',
    routingKey: 'payment.v1.requested',
    deadLetterExchange: 'payment.v1.dlq',
    deadLetterRoutingKey: 'payment.requested.dlq',
    isConsumer: false,
  },
  // Consumir resultado do pagamento (PAYMENT -> ORDER: link para enviar por email)
  paymentProcessed: {
    exchange: 'payment.v1',
    queue: 'payment.v1.processed',
    routingKey: 'payment.processed',
    deadLetterExchange: 'payment.v1.dlq',
    deadLetterRoutingKey: 'payment.processed.dlq',
    strategyKey: 'paymentProcessed',
    isConsumer: true,
  },
};

export const getRabbitMQConfigs = (): RabbitMQConfig[] => {
  return Object.values(rabbitMQConfig);
};

export const getConsumerConfigs = (): RabbitMQConfig[] => {
  return getRabbitMQConfigs().filter((c) => c.isConsumer !== false);
};
