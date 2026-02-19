import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentFieldsWorkOrders1767700000000 implements MigrationInterface {
  name = 'AddPaymentFieldsWorkOrders1767700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_orders" ADD "payment_init_point" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" ADD "payment_preference_id" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_orders" DROP COLUMN "payment_preference_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" DROP COLUMN "payment_init_point"`,
    );
  }
}
