import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators';

@Controller('health')
export class AppController {
  @Public()
  @Get()
  health() {
    return { status: 'ok' };
  }
}
