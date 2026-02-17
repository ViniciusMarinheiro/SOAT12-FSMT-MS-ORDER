import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ApiHttpService } from './api-http.service';
import { BaseApiHttpService } from './base-api-http.service';
import { EnvConfigModule } from '@/common/service/env/env-config.module';

@Module({
  imports: [HttpModule, EnvConfigModule],
  providers: [BaseApiHttpService, ApiHttpService],
  exports: [ApiHttpService],
})
export class ApiHttpModule {}
