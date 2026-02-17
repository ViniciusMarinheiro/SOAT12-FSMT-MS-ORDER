import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkOrderStatusLog1767642362154 implements MigrationInterface {
  name = 'WorkOrderStatusLog1767642362154';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se o enum já existe antes de criar
    const enumExists = await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'work_order_status_logs_status_enum' 
        AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      )`,
    );

    if (!enumExists[0].exists) {
      await queryRunner.query(
        `CREATE TYPE "public"."work_order_status_logs_status_enum" AS ENUM('RECEIVED', 'DIAGNOSING', 'AWAITING_APPROVAL', 'IN_PROGRESS', 'FINISHED', 'DELIVERED', 'REJECTED')`,
      );
    }
    await queryRunner.query(
      `CREATE TABLE "work_order_status_logs" ("id" SERIAL NOT NULL, "work_order_id" integer NOT NULL, "status" "public"."work_order_status_logs_status_enum" NOT NULL, "started_at" TIMESTAMP NOT NULL, "finished_at" TIMESTAMP, CONSTRAINT "PK_3513f4d3d8a4b315998a9799caf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_order_status_logs" ADD CONSTRAINT "FK_7d86ff9a065ab532832b22c81d0" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_order_status_logs" DROP CONSTRAINT "FK_7d86ff9a065ab532832b22c81d0"`,
    );
    await queryRunner.query(`DROP TABLE "work_order_status_logs"`);
    await queryRunner.query(
      `DROP TYPE "public"."work_order_status_logs_status_enum"`,
    );
  }
}

