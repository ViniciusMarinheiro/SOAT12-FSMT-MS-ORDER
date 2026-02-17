import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRejectStatus1759965714868 implements MigrationInterface {
  name = 'AddRejectStatus1759965714868';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_orders" ALTER COLUMN "protocol" DROP DEFAULT`,
    );

    // Verificar se o enum já tem o valor REJECTED
    const enumValues = await queryRunner.query(
      `SELECT enumlabel FROM pg_enum 
       WHERE enumtypid = (
         SELECT oid FROM pg_type 
         WHERE typname = 'work_orders_status_enum' 
         AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
       )`,
    );

    const hasRejected = enumValues.some((v: any) => v.enumlabel === 'REJECTED');

    if (!hasRejected) {
      // Adicionar REJECTED ao enum existente (PostgreSQL não suporta IF NOT EXISTS, então verificamos antes)
      try {
        await queryRunner.query(
          `ALTER TYPE "public"."work_orders_status_enum" ADD VALUE 'REJECTED'`,
        );
      } catch (error: any) {
        // Se já existir, ignorar o erro
        if (!error.message?.includes('already exists')) {
          throw error;
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."work_orders_status_enum_old" AS ENUM('RECEIVED', 'DIAGNOSING', 'AWAITING_APPROVAL', 'IN_PROGRESS', 'FINISHED', 'DELIVERED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" ALTER COLUMN "status" TYPE "public"."work_orders_status_enum_old" USING "status"::"text"::"public"."work_orders_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" ALTER COLUMN "status" SET DEFAULT 'RECEIVED'`,
    );
    await queryRunner.query(`DROP TYPE "public"."work_orders_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."work_orders_status_enum_old" RENAME TO "work_orders_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" ALTER COLUMN "protocol" SET DEFAULT ''`,
    );
  }
}
