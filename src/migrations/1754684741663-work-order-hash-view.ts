import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkOrderHashView1754684741663 implements MigrationInterface {
  name = 'WorkOrderHashView1754684741663';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a coluna já existe (pode ter sido criada na migration inicial)
    const currentSchema = await queryRunner.query(`SELECT current_schema()`);
    const schemaName = currentSchema[0].current_schema || 'orders';
    
    const columnExists = await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = $1
        AND table_name = 'work_orders' 
        AND column_name = 'hash_view'
      )`,
      [schemaName],
    );

    if (!columnExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "work_orders" ADD "hash_view" character varying`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_orders" DROP COLUMN "hash_view"`,
    );
  }
}
