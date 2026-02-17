export interface MessageConfig {
  queue: string;
  exchange?: string;
  routingKey: string;
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
}

export interface MessageHandler<T = any> {
  handle(message: T): Promise<void>;
}
