import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Sistem sağlık kontrolü için gerekli endpoint.
   * GET /health
   * @returns {Object} - Sistem sağlık bilgileri
   * @example
   * {
   *   status: 'ok',
   *   timestamp: '2021-01-01T00:00:00.000Z',
   *   service: 'iceberg-backend',
   * }
   */
  @Get('health')
  @ApiOperation({ summary: 'Sistem sağlık kontrolü' })
  @ApiResponse({
    status: 200,
    description: 'Sistem sağlıklı',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z',
        service: 'iceberg-backend',
      },
    },
  })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'iceberg-backend',
    };
  }

  @Get('hello')
  getHello() {
    return this.appService.getHello();
  }
}
