import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { SimulationService } from './simulation.service';
import { RunSimulationDto } from './dto/run-simulation.dto';
import { SimulationReport, ScenarioResult } from './dto/simulation-result.dto';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { AuditAction, AuditEntityType } from '../common/entities/audit-log.entity';

@ApiTags('simulation')
@Controller('simulation')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  /**
   * Tek bir simülasyon senaryosu çalıştırır
   * POST /simulation/run
   */
  @Post('run')
  @HttpCode(HttpStatus.OK)
  @AuditLog({
    action: AuditAction.CREATE,
    entityType: AuditEntityType.TRANSACTION,
    skipResponse: true,
  })
  @ApiOperation({
    summary: 'Tek bir simülasyon senaryosu çalıştırır',
    description:
      'Belirtilen senaryoyu çalıştırır ve sonuçları döner. Senaryolar: normal-same-agent, normal-different-agents, critical-large-amount, critical-soft-delete, critical-completed, error-invalid-transition, error-invalid-agent, error-same-stage, multiple-transactions',
  })
  @ApiBody({ type: RunSimulationDto })
  @ApiResponse({
    status: 200,
    description: 'Simülasyon başarıyla çalıştırıldı',
    type: ScenarioResult,
  })
  async runSimulation(
    @Body() runSimulationDto: RunSimulationDto,
  ): Promise<ScenarioResult> {
    return this.simulationService.runSimulation(runSimulationDto);
  }

  /**
   * Tüm simülasyon senaryolarını sırayla çalıştırır
   * POST /simulation/run-all
   */
  @Post('run-all')
  @HttpCode(HttpStatus.OK)
  @AuditLog({
    action: AuditAction.CREATE,
    entityType: AuditEntityType.TRANSACTION,
    skipResponse: true,
  })
  @ApiOperation({
    summary: 'Tüm simülasyon senaryolarını çalıştırır',
    description:
      'Tüm senaryoları sırayla çalıştırır ve detaylı bir rapor döner. Bu işlem birkaç dakika sürebilir.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tüm simülasyonlar başarıyla çalıştırıldı',
    type: SimulationReport,
  })
  async runAllScenarios(): Promise<SimulationReport> {
    return this.simulationService.runAllScenarios();
  }

  /**
   * Son simülasyon raporunu döner
   * GET /simulation/report
   */
  @Get('report')
  @ApiOperation({
    summary: 'Son simülasyon raporunu getirir',
    description:
      'En son çalıştırılan simülasyonun (run-all) detaylı raporunu döner.',
  })
  @ApiResponse({
    status: 200,
    description: 'Simülasyon raporu başarıyla getirildi',
    type: SimulationReport,
  })
  @ApiResponse({
    status: 404,
    description: 'Henüz simülasyon çalıştırılmamış',
  })
  getReport(): SimulationReport {
    const report = this.simulationService.getLastReport();
    if (!report) {
      throw new NotFoundException(
        'No simulation report available. Please run a simulation first.',
      );
    }
    return report;
  }
}

