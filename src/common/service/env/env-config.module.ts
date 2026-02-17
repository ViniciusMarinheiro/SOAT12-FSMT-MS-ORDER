import { Global, Module } from '@nestjs/common';
import { EnvConfigService } from './env-config.service';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './env';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      validate: (env) => {
        return envSchema.parse(env);
      },
      isGlobal: true,
      cache: true,
      expandVariables: true,
    }),
  ],
  providers: [EnvConfigService],
  exports: [EnvConfigService],
})
export class EnvConfigModule {}
