import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Client } from 'pg';
import { WorkOrder } from '../../../modules/work-orders/infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from '../../../modules/work-orders/infrastructure/database/work-order-status-log.entity';
import { WorkOrderService } from '../../../modules/work-orders/infrastructure/database/work-order-service.entity';
import { WorkOrderPart } from '../../../modules/work-orders/infrastructure/database/work-order-part.entity';

config();

async function ensureSchemaExists() {
  const schemaName = process.env.DB_SCHEMA || 'orders';

  if (schemaName === 'public') {
    return;
  }

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'postgres',
  });

  try {
    await client.connect();
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    await client.end();
  } catch (error) {
    console.error('Erro ao criar schema:', error);
    await client.end();
    throw error;
  }
}

if (process.env.NODE_ENV !== 'test') {
  ensureSchemaExists().catch(console.error);
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'postgres',
  schema: process.env.DB_SCHEMA || 'public',
  entities: [WorkOrder, WorkOrderStatusLog, WorkOrderService, WorkOrderPart],
  migrations:
    process.env.NODE_ENV === 'production'
      ? ['dist/src/migrations/*.js']
      : ['src/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
});
