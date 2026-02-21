import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@/common/strategies/jwt.strategy';
import { EnvConfigModule } from '@/common/service/env/env-config.module';
import { EnvConfigService } from '@/common/service/env/env-config.service';

@Module({
  imports: [
    PassportModule,
    EnvConfigModule,
    JwtModule.registerAsync({
      imports: [EnvConfigModule],
      useFactory: async (configService: EnvConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get(
            'JWT_EXPIRES_IN',
          ) as unknown as SignOptions['expiresIn'],
        },
      }),
      inject: [EnvConfigService],
    }),
  ],
  providers: [JwtStrategy],
  exports: [JwtStrategy],
})
export class AuthModule {}
