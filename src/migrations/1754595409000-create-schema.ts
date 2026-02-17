import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchema1754595409000 implements MigrationInterface {
  name = 'CreateSchema1754595409000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schemaName = process.env.DB_SCHEMA || 'orders';

    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    await queryRunner.query(`SET search_path TO "${schemaName}", public`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schemaName = process.env.DB_SCHEMA || 'orders';
    await queryRunner.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  }
}
