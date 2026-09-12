import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import type { DatabaseHealthResponse, HealthResponse } from '@pcc/contracts';

import { DatabaseService } from './database.service.js';

@Controller('api/v1')
export class AppController {
  constructor(private readonly database: DatabaseService) {}

  @Get('health')
  health(): HealthResponse {
    return {
      service: 'api',
      status: 'ok',
    };
  }

  @Get('health/database')
  async databaseHealth(): Promise<DatabaseHealthResponse> {
    try {
      await this.database.checkConnection();
      return {
        service: 'database',
        status: 'ok',
      };
    } catch {
      throw new ServiceUnavailableException({
        service: 'database',
        status: 'unavailable',
      });
    }
  }
}
