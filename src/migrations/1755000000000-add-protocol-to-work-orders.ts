import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProtocolToWorkOrders1755000000000 implements MigrationInterface {
  name = 'AddProtocolToWorkOrders1755000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a coluna já existe (pode ter sido criada na migration inicial)
    const currentSchema = await queryRunner.query(`SELECT current_schema()`);
    const schemaName = currentSchema[0].current_schema || 'orders';

    const columnExists = await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = $1
        AND table_name = 'work_orders' 
        AND column_name = 'protocol'
      )`,
      [schemaName],
    );

    if (!columnExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "work_orders" ADD "protocol" character varying NOT NULL DEFAULT ''`,
      );

      const workOrders = await queryRunner.query(
        `SELECT id FROM "work_orders" ORDER BY id`,
      );

      for (const workOrder of workOrders) {
        const currentYear = new Date().getFullYear();
        const paddedId = workOrder.id.toString().padStart(5, '0');
        const protocol = `OS-${currentYear}-${paddedId}`;

        await queryRunner.query(
          `UPDATE "work_orders" SET "protocol" = $1 WHERE "id" = $2`,
          [protocol, workOrder.id],
        );
      }
    }

    // Verificar se a constraint já existe
    const constraintExists = await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'UQ_work_orders_protocol'
      )`,
    );

    if (!constraintExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "work_orders" ADD CONSTRAINT "UQ_work_orders_protocol" UNIQUE ("protocol")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_orders" DROP CONSTRAINT "UQ_work_orders_protocol"`,
    );
    await queryRunner.query(`ALTER TABLE "work_orders" DROP COLUMN "protocol"`);
  }
}
