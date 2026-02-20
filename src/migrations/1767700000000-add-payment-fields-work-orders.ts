import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentFieldsWorkOrders1767700000000 implements MigrationInterface {
  name = 'AddPaymentFieldsWorkOrders1767700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Usar o schema do ambiente ou o padrão 'orders'
    const schemaName = process.env.DB_SCHEMA || 'orders';

    const paymentInitPointExists = await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = $1
        AND table_name = 'work_orders' 
        AND column_name = 'payment_init_point'
      )`,
      [schemaName],
    );

    if (!paymentInitPointExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "${schemaName}"."work_orders" ADD "payment_init_point" character varying`,
      );
    }

    const paymentPreferenceIdExists = await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = $1
        AND table_name = 'work_orders' 
        AND column_name = 'payment_preference_id'
      )`,
      [schemaName],
    );

    if (!paymentPreferenceIdExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "${schemaName}"."work_orders" ADD "payment_preference_id" character varying`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schemaName = process.env.DB_SCHEMA || 'orders';
    await queryRunner.query(
      `ALTER TABLE "${schemaName}"."work_orders" DROP COLUMN "payment_preference_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "${schemaName}"."work_orders" DROP COLUMN "payment_init_point"`,
    );
  }
}
