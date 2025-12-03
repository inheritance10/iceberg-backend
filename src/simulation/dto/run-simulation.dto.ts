import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsObject } from 'class-validator';

export enum SimulationScenario {
  NORMAL_SAME_AGENT = 'normal-same-agent',
  NORMAL_DIFFERENT_AGENTS = 'normal-different-agents',
  CRITICAL_LARGE_AMOUNT = 'critical-large-amount',
  CRITICAL_SOFT_DELETE = 'critical-soft-delete',
  CRITICAL_COMPLETED = 'critical-completed',
  ERROR_INVALID_TRANSITION = 'error-invalid-transition',
  ERROR_INVALID_AGENT = 'error-invalid-agent',
  ERROR_SAME_STAGE = 'error-same-stage',
  MULTIPLE_TRANSACTIONS = 'multiple-transactions',
  ALL = 'all',
}

export class RunSimulationDto {
  @ApiProperty({
    description: 'Çalıştırılacak simülasyon senaryosu',
    enum: SimulationScenario,
    example: SimulationScenario.NORMAL_SAME_AGENT,
  })
  @IsEnum(SimulationScenario)
  scenario: SimulationScenario;

  @ApiPropertyOptional({
    description: 'Özel simülasyon konfigürasyonu (custom senaryo için)',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

