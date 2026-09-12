import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@pcc/contracts';

@Controller('api/v1')
export class AppController {
  @Get('health')
  health(): HealthResponse {
    return {
      service: 'api',
      status: 'ok',
    };
  }
}
