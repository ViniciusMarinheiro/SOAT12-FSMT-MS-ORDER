import { z } from 'zod';

export const envSchema = z
  .object({
    DB_HOST: z.string(),
    DB_PORT: z.string(),
    DB_USERNAME: z.string(),
    DB_PASSWORD: z.string(),
    DB_DATABASE: z.string(),
    DB_SCHEMA: z.string(),
    JWT_SECRET: z.string(),
    JWT_EXPIRES_IN: z.string(),
    PORT: z.string().default('3333'),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    DOCUMENTATION_PREFIX: z.string(),
    SMTP_HOST: z.string(),
    PORT_EMAIL: z.string().transform((val) => parseInt(val, 10)),
    SECURE_EMAIL: z.string().transform((val) => val.toLowerCase() === 'true'),
    USER_EMAIL: z.string(),
    PASS_EMAIL: z.string(),
    REDIS_HOST: z.string().optional().default('127.0.0.1'),
    REDIS_PORT: z.coerce.number().optional().default(6379),
    REDIS_DB: z.coerce.number().optional().default(0),
    REDIS_PASSWORD: z.string().optional().default(''),
    RABBITMQ_URL: z.string().optional(),
    RABBITMQ_CONSUMER_MAX_RETRIES: z.coerce.number().optional().default(3),
    RABBITMQ_CONSUMER_RETRY_DELAY_MS: z.coerce
      .number()
      .optional()
      .default(1000),
    DLQ_REPUBLISH_TO_MAIN: z
      .string()
      .transform((val) => val.toLowerCase() === 'true')
      .optional()
      .default(false),
    SERVER_URL: z.string(),
    LAMBDA_FUNCTION_URL: z.string().optional(),
    LAMBDA_JWT_SECRET: z.string(),
    API_BASE_URL: z.string().optional().default('http://localhost:3333'),
    PAYMENT_SERVICE_URL: z.string().optional().default('http://localhost:3000'),
  })
  .transform((env) => ({
    ...env,
    SERVER_URL_PREFIX: `${env.SERVER_URL.replace(/\/$/, '')}/${env.DOCUMENTATION_PREFIX.replace(/^\//, '')}`,
  }));

export type Env = z.infer<typeof envSchema>;
