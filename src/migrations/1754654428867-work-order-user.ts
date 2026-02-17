import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkOrderUser1754654428867 implements MigrationInterface {
  name = 'WorkOrderUser1754654428867';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a coluna já existe (pode ter sido criada na migration inicial)
    const currentSchema = await queryRunner.query(`SELECT current_schema()`);
    const schemaName = currentSchema[0].current_schema || 'orders';

    const columnExists = await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = $1
        AND table_name = 'work_orders' 
        AND column_name = 'user_id'
      )`,
      [schemaName],
    );

    if (!columnExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "work_orders" ADD "user_id" integer NOT NULL`,
      );
    }

    // Não criamos FK para users pois é de outro microserviço
    // A validação deve ser feita via API
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_orders" DROP CONSTRAINT "FK_c3013397350780ff9a3ba587f91"`,
    );
    await queryRunner.query(`ALTER TABLE "work_orders" DROP COLUMN "user_id"`);
  }
}
