// database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './database.config';
import { EnvConfigModule } from '../env/env-config.module';
import { EnvConfigService } from '../env/env-config.service';
import { Client } from 'pg';

@Module({
  imports: [
    EnvConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [EnvConfigModule],
      useFactory: async (envConfigService: EnvConfigService) => {
        // Criar schema antes de inicializar TypeORM
        const schemaName = envConfigService.get('DB_SCHEMA');
        if (schemaName && schemaName !== 'public') {
          const client = new Client({
            host: envConfigService.get('DB_HOST'),
            port: parseInt(envConfigService.get('DB_PORT')),
            user: envConfigService.get('DB_USERNAME'),
            password: envConfigService.get('DB_PASSWORD'),
            database: envConfigService.get('DB_DATABASE'),
          });

          try {
            await client.connect();
            await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
            await client.end();
          } catch (error) {
            console.error('Erro ao criar schema:', error);
            await client.end();
            // Não lançar erro para não bloquear a inicialização
          }
        }

        return databaseConfig(envConfigService);
      },
      inject: [EnvConfigService],
    }),
  ],
})
export class DatabaseModule {}
