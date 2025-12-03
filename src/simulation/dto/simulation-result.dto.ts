import { ApiProperty } from '@nestjs/swagger';

export class ScenarioStep {
  @ApiProperty({ description: 'Adım adı' })
  name: string;

  @ApiProperty({ description: 'Adım açıklaması' })
  description: string;

  @ApiProperty({ description: 'Başarılı mı?' })
  success: boolean;

  @ApiProperty({ description: 'Adım süresi (ms)' })
  duration: number;

  @ApiProperty({ description: 'Adım verisi', required: false })
  data?: any;

  @ApiProperty({ description: 'Hata mesajı', required: false })
  error?: string;

  @ApiProperty({ description: 'Alert tetiklendi mi?', required: false })
  alertTriggered?: boolean;
}

export class ScenarioResult {
  @ApiProperty({ description: 'Senaryo adı' })
  scenario: string;

  @ApiProperty({ description: 'Başarılı mı?' })
  success: boolean;

  @ApiProperty({ description: 'Senaryo süresi (ms)' })
  duration: number;

  @ApiProperty({ description: 'Adımlar', type: [ScenarioStep] })
  steps: ScenarioStep[];

  @ApiProperty({ description: 'Alert sayısı' })
  alertCount: number;

  @ApiProperty({ description: 'Hata sayısı' })
  errorCount: number;
}

export class SimulationReport {
  @ApiProperty({ description: 'Toplam senaryo sayısı' })
  totalScenarios: number;

  @ApiProperty({ description: 'Başarılı senaryo sayısı' })
  passed: number;

  @ApiProperty({ description: 'Başarısız senaryo sayısı' })
  failed: number;

  @ApiProperty({ description: 'Toplam alert sayısı' })
  totalAlerts: number;

  @ApiProperty({ description: 'Toplam hata sayısı' })
  totalErrors: number;

  @ApiProperty({ description: 'Toplam süre (ms)' })
  totalDuration: number;

  @ApiProperty({ description: 'Simülasyon başlangıç zamanı' })
  startTime: Date;

  @ApiProperty({ description: 'Simülasyon bitiş zamanı' })
  endTime: Date;

  @ApiProperty({ description: 'Senaryo sonuçları', type: [ScenarioResult] })
  results: ScenarioResult[];
}

