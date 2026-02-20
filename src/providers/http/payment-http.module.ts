import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EnvConfigModule } from '@/common/service/env/env-config.module';
import { PaymentHttpService } from './payment-http.service';

@Module({
  imports: [HttpModule.register({ timeout: 15000 }), EnvConfigModule],
  providers: [PaymentHttpService],
  exports: [PaymentHttpService],
})
export class PaymentHttpModule {}
