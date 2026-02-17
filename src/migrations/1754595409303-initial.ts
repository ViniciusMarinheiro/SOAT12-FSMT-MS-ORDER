import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1754595409303 implements MigrationInterface {
  name = 'Initial1754595409303';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se o enum já existe antes de criar (ele já existe na API principal)
    const enumExists = await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'work_orders_status_enum' 
        AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      )`,
    );

    if (!enumExists[0].exists) {
      await queryRunner.query(
        `CREATE TYPE "public"."work_orders_status_enum" AS ENUM('RECEIVED', 'DIAGNOSING', 'AWAITING_APPROVAL', 'IN_PROGRESS', 'FINISHED', 'DELIVERED')`,
      );
    }

    // Criar apenas tabelas relacionadas a work orders
    // As outras tabelas (customers, vehicles, services, parts, users) já existem na API principal
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "work_orders" (
        "id" SERIAL NOT NULL, 
        "customer_id" integer NOT NULL, 
        "vehicle_id" integer NOT NULL, 
        "user_id" integer NOT NULL,
        "hash_view" character varying,
        "protocol" character varying UNIQUE,
        "status" "public"."work_orders_status_enum" NOT NULL DEFAULT 'RECEIVED', 
        "total_amount" integer NOT NULL DEFAULT '0', 
        "started_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "finished_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
        CONSTRAINT "PK_29f6c1884082ee6f535aed93660" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "work_order_services" (
        "id" SERIAL NOT NULL, 
        "work_order_id" integer NOT NULL, 
        "service_id" integer NOT NULL, 
        "quantity" integer NOT NULL DEFAULT '1', 
        "total_price" integer NOT NULL, 
        CONSTRAINT "PK_67cc6db8cc36862baf74fbfa2b1" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "work_order_parts" (
        "id" SERIAL NOT NULL, 
        "work_order_id" integer NOT NULL, 
        "part_id" integer NOT NULL, 
        "quantity" integer NOT NULL DEFAULT '1', 
        "total_price" integer NOT NULL, 
        CONSTRAINT "PK_f940468276c041deed13cd240cc" PRIMARY KEY ("id")
      )`,
    );

    // Foreign keys apenas para tabelas internas do MS-ORDER
    // Não criamos FKs para tabelas externas (customers, vehicles, users, services, parts)
    // pois são de outros microserviços e devem ser validadas via API

    await queryRunner.query(
      `DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_work_order_services_work_order_id'
        ) THEN
          ALTER TABLE "work_order_services" ADD CONSTRAINT "FK_work_order_services_work_order_id" 
          FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$`,
    );

    await queryRunner.query(
      `DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_work_order_parts_work_order_id'
        ) THEN
          ALTER TABLE "work_order_parts" ADD CONSTRAINT "FK_work_order_parts_work_order_id" 
          FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover apenas as tabelas de work orders
    // Não removemos customers, vehicles, services, parts, users pois são da API principal
    await queryRunner.query(`DROP TABLE IF EXISTS "work_order_parts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "work_order_services"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "work_orders"`);

    // Não removemos o enum pois pode estar sendo usado pela API principal
    // Se precisar remover, fazer manualmente depois de verificar
  }
}
