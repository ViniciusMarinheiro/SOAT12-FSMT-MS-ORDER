import { MigrationInterface, QueryRunner } from 'typeorm';

export class WordOrderStartFinish1754944486360 implements MigrationInterface {
  name = 'WordOrderStartFinish1754944486360';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se as colunas já existem (podem ter sido criadas na migration inicial)
    const currentSchema = await queryRunner.query(`SELECT current_schema()`);
    const schemaName = currentSchema[0].current_schema || 'orders';

    const startedAtExists = await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = $1
        AND table_name = 'work_orders' 
        AND column_name = 'started_at'
      )`,
      [schemaName],
    );

    if (!startedAtExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "work_orders" ADD "started_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
      );
    }

    const finishedAtExists = await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = $1
        AND table_name = 'work_orders' 
        AND column_name = 'finished_at'
      )`,
      [schemaName],
    );

    if (!finishedAtExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "work_orders" ADD "finished_at" TIMESTAMP WITH TIME ZONE`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_orders" DROP COLUMN "finished_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" DROP COLUMN "started_at"`,
    );
  }
}
