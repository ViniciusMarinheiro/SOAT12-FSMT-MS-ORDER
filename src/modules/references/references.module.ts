import { Module } from '@nestjs/common';
import { StockValidationService } from './application/services/stock-validation.service';
import { ApiHttpModule } from '@/providers/http/api-http.module';

@Module({
  imports: [ApiHttpModule],
  providers: [StockValidationService],
  exports: [StockValidationService],
})
export class ReferencesModule {}
