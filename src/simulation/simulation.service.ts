import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { AgentsService } from '../agents/agents.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateAgentDto } from '../agents/dto/create-agent.dto';
import { CreateTransactionDto } from '../transactions/dto/create-transaction.dto';
import { UpdateTransactionStageDto } from '../transactions/dto/update-transaction-stage.dto';
import { PropertyTypeEnum } from '../transactions/enums/property-type.enum';
import { CurrentStageEnum } from '../transactions/enums/current-stage.enum';
import {
  SimulationScenario,
  RunSimulationDto,
} from './dto/run-simulation.dto';
import {
  SimulationReport,
  ScenarioResult,
  ScenarioStep,
} from './dto/simulation-result.dto';

@Injectable()
export class SimulationService {
  private currentReport: SimulationReport | null = null;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly agentsService: AgentsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * Tek bir senaryo çalıştırır
   */
  async runSimulation(dto: RunSimulationDto): Promise<ScenarioResult> {
    this.logger.info(`Starting simulation: ${dto.scenario}`, {
      scenario: dto.scenario,
      tags: ['simulation', 'start'],
    });

    const startTime = Date.now();
    const steps: ScenarioStep[] = [];

    try {
      let result: ScenarioResult;

      switch (dto.scenario) {
        case SimulationScenario.NORMAL_SAME_AGENT:
          result = await this.runNormalSameAgentScenario(steps);
          break;
        case SimulationScenario.NORMAL_DIFFERENT_AGENTS:
          result = await this.runNormalDifferentAgentsScenario(steps);
          break;
        case SimulationScenario.CRITICAL_LARGE_AMOUNT:
          result = await this.runCriticalLargeAmountScenario(steps);
          break;
        case SimulationScenario.CRITICAL_SOFT_DELETE:
          result = await this.runCriticalSoftDeleteScenario(steps);
          break;
        case SimulationScenario.CRITICAL_COMPLETED:
          result = await this.runCriticalCompletedScenario(steps);
          break;
        case SimulationScenario.ERROR_INVALID_TRANSITION:
          result = await this.runErrorInvalidTransitionScenario(steps);
          break;
        case SimulationScenario.ERROR_INVALID_AGENT:
          result = await this.runErrorInvalidAgentScenario(steps);
          break;
        case SimulationScenario.ERROR_SAME_STAGE:
          result = await this.runErrorSameStageScenario(steps);
          break;
        case SimulationScenario.MULTIPLE_TRANSACTIONS:
          result = await this.runMultipleTransactionsScenario(steps);
          break;
        default:
          throw new Error(`Unknown scenario: ${dto.scenario}`);
      }

      result.duration = Date.now() - startTime;
      result.steps = steps;

      this.logger.info(`Simulation completed: ${dto.scenario}`, {
        scenario: dto.scenario,
        success: result.success,
        duration: result.duration,
        alerts: result.alertCount,
        errors: result.errorCount,
        tags: ['simulation', 'complete'],
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Simulation failed: ${dto.scenario}`, {
        scenario: dto.scenario,
        error: error.message,
        duration,
        tags: ['simulation', 'error'],
      });

      return {
        scenario: dto.scenario,
        success: false,
        duration,
        steps,
        alertCount: 0,
        errorCount: 1,
      };
    }
  }

  /**
   * Tüm senaryoları sırayla çalıştırır
   */
  async runAllScenarios(): Promise<SimulationReport> {
    const startTime = new Date();
    const scenarios = Object.values(SimulationScenario).filter(
      (s) => s !== SimulationScenario.ALL,
    );

    this.logger.info('Starting all simulation scenarios', {
      totalScenarios: scenarios.length,
      tags: ['simulation', 'all', 'start'],
    });

    const results: ScenarioResult[] = [];

    for (const scenario of scenarios) {
      const result = await this.runSimulation({ scenario });
      results.push(result);
    }

    const endTime = new Date();
    const totalDuration = endTime.getTime() - startTime.getTime();

    const report: SimulationReport = {
      totalScenarios: scenarios.length,
      passed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      totalAlerts: results.reduce((sum, r) => sum + r.alertCount, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errorCount, 0),
      totalDuration,
      startTime,
      endTime,
      results,
    };

    this.currentReport = report;

    this.logger.info('All simulation scenarios completed', {
      totalScenarios: report.totalScenarios,
      passed: report.passed,
      failed: report.failed,
      totalAlerts: report.totalAlerts,
      totalErrors: report.totalErrors,
      totalDuration: report.totalDuration,
      tags: ['simulation', 'all', 'complete'],
    });

    return report;
  }

  /**
   * Son simülasyon raporunu döner
   */
  getLastReport(): SimulationReport | null {
    return this.currentReport;
  }

  // ==================== Senaryo Implementasyonları ====================

  /**
   * Senaryo 1: Normal Flow - Aynı Acente
   */
  private async runNormalSameAgentScenario(
    steps: ScenarioStep[],
  ): Promise<ScenarioResult> {
    let agentId: string;
    let transactionId: string;
    let alertCount = 0;
    let errorCount = 0;

    try {
      // Step 1: Agent oluştur
      const step1Start = Date.now();
      const agent = await this.agentsService.create({
        name: 'Ahmet Yılmaz',
        email: `ahmet-${Date.now()}@simulation.com`,
        phone: '05551234567',
      });
      agentId = (agent as any)._id.toString();
      steps.push({
        name: 'create-agent',
        description: 'Agent oluşturuldu (Ahmet Yılmaz)',
        success: true,
        duration: Date.now() - step1Start,
        data: { agentId },
      });
      this.logger.info('Simulation step: Agent created', {
        step: 'create-agent',
        agentId,
        tags: ['simulation', 'step'],
      });

      // Step 2: Transaction oluştur (aynı acente)
      const step2Start = Date.now();
      const transaction = await this.transactionsService.create({
        propertyId: 'prop-sim-1',
        propertyType: PropertyTypeEnum.SALE,
        totalServiceFee: 10000,
        listingAgentId: agentId,
        sellingAgentId: agentId, // Aynı acente
      });
      transactionId = (transaction as any)._id.toString();
      steps.push({
        name: 'create-transaction',
        description: 'Transaction oluşturuldu (aynı acente)',
        success: true,
        duration: Date.now() - step2Start,
        data: { transactionId, agentId },
      });
      this.logger.info('Simulation step: Transaction created', {
        step: 'create-transaction',
        transactionId,
        tags: ['simulation', 'step'],
      });

      // Step 3-5: Stage'leri güncelle
      const stages = [
        { stage: CurrentStageEnum.EARNEST_MONEY, notes: 'Kapora ödendi' },
        { stage: CurrentStageEnum.TITLE_DEED, notes: 'Tapu işlemleri tamamlandı' },
        { stage: CurrentStageEnum.COMPLETED, notes: 'İşlem tamamlandı' },
      ];

      for (const stageUpdate of stages) {
        const stepStart = Date.now();
        const updated = await this.transactionsService.updateStage(
          transactionId,
          stageUpdate,
        );

        // COMPLETED olduğunda alert tetiklenir
        if (stageUpdate.stage === CurrentStageEnum.COMPLETED) {
          alertCount++;
          steps.push({
            name: `update-stage-${stageUpdate.stage}`,
            description: `Stage güncellendi: ${stageUpdate.stage}`,
            success: true,
            duration: Date.now() - stepStart,
            data: { stage: stageUpdate.stage },
            alertTriggered: true,
          });
          this.logger.warn('Simulation alert: Transaction completed', {
            step: `update-stage-${stageUpdate.stage}`,
            transactionId,
            tags: ['simulation', 'alert', 'critical'],
          });
        } else {
          steps.push({
            name: `update-stage-${stageUpdate.stage}`,
            description: `Stage güncellendi: ${stageUpdate.stage}`,
            success: true,
            duration: Date.now() - stepStart,
            data: { stage: stageUpdate.stage },
          });
        }

        this.logger.info('Simulation step: Stage updated', {
          step: `update-stage-${stageUpdate.stage}`,
          transactionId,
          stage: stageUpdate.stage,
          tags: ['simulation', 'step'],
        });
      }

      // Step 6: Commission kontrolü
      const step6Start = Date.now();
      const commission = await this.transactionsService.getCommissionBreakdown(
        transactionId,
      );
      const commissionValid =
        commission.agencyAmount === 5000 &&
        commission.agents.length === 1 &&
        commission.agents[0].amount === 5000;

      steps.push({
        name: 'validate-commission',
        description: 'Commission hesaplaması kontrol edildi',
        success: commissionValid,
        duration: Date.now() - step6Start,
        data: {
          agencyAmount: commission.agencyAmount,
          agentCount: commission.agents.length,
          agentAmount: commission.agents[0]?.amount,
        },
      });

      if (!commissionValid) {
        errorCount++;
        this.logger.error('Simulation error: Commission validation failed', {
          step: 'validate-commission',
          transactionId,
          expected: { agencyAmount: 5000, agentAmount: 5000 },
          actual: commission,
          tags: ['simulation', 'error'],
        });
      } else {
        this.logger.info('Simulation step: Commission validated', {
          step: 'validate-commission',
          transactionId,
          tags: ['simulation', 'step'],
        });
      }

      return {
        scenario: SimulationScenario.NORMAL_SAME_AGENT,
        success: commissionValid && errorCount === 0,
        duration: 0, // Toplam süre dışarıda hesaplanacak
        steps: [],
        alertCount,
        errorCount,
      };
    } catch (error) {
      errorCount++;
      steps.push({
        name: 'error',
        description: `Hata oluştu: ${error.message}`,
        success: false,
        duration: 0,
        error: error.message,
      });
      this.logger.error('Simulation error', {
        scenario: SimulationScenario.NORMAL_SAME_AGENT,
        error: error.message,
        tags: ['simulation', 'error'],
      });

      return {
        scenario: SimulationScenario.NORMAL_SAME_AGENT,
        success: false,
        duration: 0,
        steps: [],
        alertCount,
        errorCount,
      };
    }
  }

  /**
   * Senaryo 2: Normal Flow - Farklı Acenteler
   */
  private async runNormalDifferentAgentsScenario(
    steps: ScenarioStep[],
  ): Promise<ScenarioResult> {
    let listingAgentId: string;
    let sellingAgentId: string;
    let transactionId: string;
    let alertCount = 0;
    let errorCount = 0;

    try {
      // Step 1-2: İki agent oluştur
      const step1Start = Date.now();
      const listingAgent = await this.agentsService.create({
        name: 'Listing Agent',
        email: `listing-${Date.now()}@simulation.com`,
        phone: '05551111111',
      });
      listingAgentId = (listingAgent as any)._id.toString();

      const sellingAgent = await this.agentsService.create({
        name: 'Selling Agent',
        email: `selling-${Date.now()}@simulation.com`,
        phone: '05552222222',
      });
      sellingAgentId = (sellingAgent as any)._id.toString();

      steps.push({
        name: 'create-agents',
        description: 'İki agent oluşturuldu',
        success: true,
        duration: Date.now() - step1Start,
        data: { listingAgentId, sellingAgentId },
      });

      // Step 3: Transaction oluştur
      const step3Start = Date.now();
      const transaction = await this.transactionsService.create({
        propertyId: 'prop-sim-2',
        propertyType: PropertyTypeEnum.SALE,
        totalServiceFee: 10000,
        listingAgentId,
        sellingAgentId,
      });
      transactionId = (transaction as any)._id.toString();
      steps.push({
        name: 'create-transaction',
        description: 'Transaction oluşturuldu (farklı acenteler)',
        success: true,
        duration: Date.now() - step3Start,
        data: { transactionId },
      });

      // Step 4-6: Stage'leri güncelle
      const stages = [
        { stage: CurrentStageEnum.EARNEST_MONEY, notes: 'Kapora ödendi' },
        { stage: CurrentStageEnum.TITLE_DEED, notes: 'Tapu işlemleri tamamlandı' },
        { stage: CurrentStageEnum.COMPLETED, notes: 'İşlem tamamlandı' },
      ];

      for (const stageUpdate of stages) {
        const stepStart = Date.now();
        await this.transactionsService.updateStage(transactionId, stageUpdate);

        if (stageUpdate.stage === CurrentStageEnum.COMPLETED) {
          alertCount++;
          steps.push({
            name: `update-stage-${stageUpdate.stage}`,
            description: `Stage güncellendi: ${stageUpdate.stage}`,
            success: true,
            duration: Date.now() - stepStart,
            alertTriggered: true,
          });
        } else {
          steps.push({
            name: `update-stage-${stageUpdate.stage}`,
            description: `Stage güncellendi: ${stageUpdate.stage}`,
            success: true,
            duration: Date.now() - stepStart,
          });
        }
      }

      // Step 7: Commission kontrolü
      const step7Start = Date.now();
      const commission = await this.transactionsService.getCommissionBreakdown(
        transactionId,
      );
      const commissionValid =
        commission.agencyAmount === 5000 &&
        commission.agents.length === 2 &&
        commission.agents[0].amount === 2500 &&
        commission.agents[1].amount === 2500;

      steps.push({
        name: 'validate-commission',
        description: 'Commission hesaplaması kontrol edildi',
        success: commissionValid,
        duration: Date.now() - step7Start,
        data: commission,
      });

      if (!commissionValid) {
        errorCount++;
      }

      return {
        scenario: SimulationScenario.NORMAL_DIFFERENT_AGENTS,
        success: commissionValid && errorCount === 0,
        duration: 0,
        steps: [],
        alertCount,
        errorCount,
      };
    } catch (error) {
      errorCount++;
      steps.push({
        name: 'error',
        description: `Hata oluştu: ${error.message}`,
        success: false,
        duration: 0,
        error: error.message,
      });

      return {
        scenario: SimulationScenario.NORMAL_DIFFERENT_AGENTS,
        success: false,
        duration: 0,
        steps: [],
        alertCount,
        errorCount,
      };
    }
  }

  /**
   * Senaryo 3: Kritik - Büyük Miktar (100,000 TL+)
   */
  private async runCriticalLargeAmountScenario(
    steps: ScenarioStep[],
  ): Promise<ScenarioResult> {
    let agentId: string;
    let transactionId: string;
    let alertCount = 0;
    let errorCount = 0;

    try {
      // Agent oluştur
      const agent = await this.agentsService.create({
        name: 'High Value Agent',
        email: `highvalue-${Date.now()}@simulation.com`,
        phone: '05559999999',
      });
      agentId = (agent as any)._id.toString();
      steps.push({
        name: 'create-agent',
        description: 'Agent oluşturuldu',
        success: true,
        duration: 0,
        data: { agentId },
      });

      // Büyük miktarlı transaction oluştur
      const transaction = await this.transactionsService.create({
        propertyId: 'prop-sim-3',
        propertyType: PropertyTypeEnum.SALE,
        totalServiceFee: 150000, // 100,000 TL üzeri - kritik
        listingAgentId: agentId,
        sellingAgentId: agentId,
      });
      transactionId = (transaction as any)._id.toString();
      steps.push({
        name: 'create-transaction',
        description: 'Büyük miktarlı transaction oluşturuldu (150,000 TL)',
        success: true,
        duration: 0,
        data: { transactionId, totalServiceFee: 150000 },
        alertTriggered: false, // Henüz alert yok, COMPLETED olunca tetiklenecek
      });

      // Stage'leri güncelle → COMPLETED
      const stages = [
        { stage: CurrentStageEnum.EARNEST_MONEY, notes: 'Kapora ödendi' },
        { stage: CurrentStageEnum.TITLE_DEED, notes: 'Tapu işlemleri tamamlandı' },
        { stage: CurrentStageEnum.COMPLETED, notes: 'İşlem tamamlandı' },
      ];

      for (const stageUpdate of stages) {
        await this.transactionsService.updateStage(transactionId, stageUpdate);

        if (stageUpdate.stage === CurrentStageEnum.COMPLETED) {
          // COMPLETED + büyük miktar = 2 alert (COMPLETED + large amount)
          alertCount += 2;
          steps.push({
            name: `update-stage-${stageUpdate.stage}`,
            description: `Stage güncellendi: ${stageUpdate.stage} (Kritik: Büyük miktar + Completed)`,
            success: true,
            duration: 0,
            alertTriggered: true,
          });
          this.logger.warn('Simulation alert: Large amount transaction completed', {
            transactionId,
            totalServiceFee: 150000,
            tags: ['simulation', 'alert', 'critical', 'large-amount'],
          });
        } else {
          steps.push({
            name: `update-stage-${stageUpdate.stage}`,
            description: `Stage güncellendi: ${stageUpdate.stage}`,
            success: true,
            duration: 0,
          });
        }
      }

      return {
        scenario: SimulationScenario.CRITICAL_LARGE_AMOUNT,
        success: true,
        duration: 0,
        steps: [],
        alertCount,
        errorCount,
      };
    } catch (error) {
      errorCount++;
      steps.push({
        name: 'error',
        description: `Hata oluştu: ${error.message}`,
        success: false,
        duration: 0,
        error: error.message,
      });

      return {
        scenario: SimulationScenario.CRITICAL_LARGE_AMOUNT,
        success: false,
        duration: 0,
        steps: [],
        alertCount,
        errorCount,
      };
    }
  }

  /**
   * Senaryo 4: Kritik - Soft Delete
   */
  private async runCriticalSoftDeleteScenario(
    steps: ScenarioStep[],
  ): Promise<ScenarioResult> {
    let agentId: string;
    let alertCount = 0;
    let errorCount = 0;

    try {
      // Agent oluştur
      const agent = await this.agentsService.create({
        name: 'To Be Deleted Agent',
        email: `tobedeleted-${Date.now()}@simulation.com`,
        phone: '05558888888',
      });
      agentId = (agent as any)._id.toString();
      steps.push({
        name: 'create-agent',
        description: 'Agent oluşturuldu',
        success: true,
        duration: 0,
        data: { agentId },
      });

      // Agent'ı soft delete et (kritik işlem)
      const deleteStart = Date.now();
      await this.agentsService.remove(agentId);
      alertCount++; // SOFT_DELETE kritik
      steps.push({
        name: 'soft-delete-agent',
        description: 'Agent soft delete edildi (Kritik işlem)',
        success: true,
        duration: Date.now() - deleteStart,
        alertTriggered: true,
      });
      this.logger.warn('Simulation alert: Agent soft deleted', {
        agentId,
        tags: ['simulation', 'alert', 'critical', 'soft-delete'],
      });

      return {
        scenario: SimulationScenario.CRITICAL_SOFT_DELETE,
        success: true,
        duration: 0,
        steps: [],
        alertCount,
        errorCount,
      };
    } catch (error) {
      errorCount++;
      steps.push({
        name: 'error',
        description: `Hata oluştu: ${error.message}`,
        success: false,
        duration: 0,
        error: error.message,
      });

      return {
        scenario: SimulationScenario.CRITICAL_SOFT_DELETE,
        success: false,
        duration: 0,
        steps: [],
        alertCount,
        errorCount,
      };
    }
  }

  /**
   * Senaryo 5: Kritik - Transaction Completed
   */
  private async runCriticalCompletedScenario(
    steps: ScenarioStep[],
  ): Promise<ScenarioResult> {
    let agentId: string;
    let transactionId: string;
    let alertCount = 0;
    let errorCount = 0;

    try {
      // Agent oluştur
      const agent = await this.agentsService.create({
        name: 'Completed Agent',
        email: `completed-${Date.now()}@simulation.com`,
        phone: '05557777777',
      });
      agentId = (agent as any)._id.toString();
      steps.push({
        name: 'create-agent',
        description: 'Agent oluşturuldu',
        success: true,
        duration: 0,
        data: { agentId },
      });

      // Transaction oluştur
      const transaction = await this.transactionsService.create({
        propertyId: 'prop-sim-5',
        propertyType: PropertyTypeEnum.SALE,
        totalServiceFee: 20000,
        listingAgentId: agentId,
        sellingAgentId: agentId,
      });
      transactionId = (transaction as any)._id.toString();
      steps.push({
        name: 'create-transaction',
        description: 'Transaction oluşturuldu',
        success: true,
        duration: 0,
        data: { transactionId },
      });

      // Stage'leri güncelle → COMPLETED
      const stages = [
        { stage: CurrentStageEnum.EARNEST_MONEY, notes: 'Kapora ödendi' },
        { stage: CurrentStageEnum.TITLE_DEED, notes: 'Tapu işlemleri tamamlandı' },
        { stage: CurrentStageEnum.COMPLETED, notes: 'İşlem tamamlandı' },
      ];

      for (const stageUpdate of stages) {
        await this.transactionsService.updateStage(transactionId, stageUpdate);

        if (stageUpdate.stage === CurrentStageEnum.COMPLETED) {
          alertCount++; // COMPLETED kritik
          steps.push({
            name: `update-stage-${stageUpdate.stage}`,
            description: `Stage güncellendi: ${stageUpdate.stage} (Kritik işlem)`,
            success: true,
            duration: 0,
            alertTriggered: true,
          });
          this.logger.warn('Simulation alert: Transaction completed', {
            transactionId,
            tags: ['simulation', 'alert', 'critical', 'completed'],
          });
        } else {
          steps.push({
            name: `update-stage-${stageUpdate.stage}`,
            description: `Stage güncellendi: ${stageUpdate.stage}`,
            success: true,
            duration: 0,
          });
        }
      }

      return {
        scenario: SimulationScenario.CRITICAL_COMPLETED,
        success: true,
        duration: 0,
        steps: [],
        alertCount,
        errorCount,
      };
    } catch (error) {
      errorCount++;
      steps.push({
        name: 'error',
        description: `Hata oluştu: ${error.message}`,
        success: false,
        duration: 0,
        error: error.message,
      });

      return {
        scenario: SimulationScenario.CRITICAL_COMPLETED,
        success: false,
        duration: 0,
        steps: [],
        alertCount,
        errorCount,
      };
    }
  }

  /**
   * Senaryo 6: Hata - Geçersiz Stage Geçişi
   */
  private async runErrorInvalidTransitionScenario(
    steps: ScenarioStep[],
  ): Promise<ScenarioResult> {
    let agentId: string;
    let transactionId: string;
    let alertCount = 0;
    let errorCount = 0;

    try {
      // Agent ve transaction oluştur
      const agent = await this.agentsService.create({
        name: 'Error Agent',
        email: `error-${Date.now()}@simulation.com`,
        phone: '05556666666',
      });
      agentId = (agent as any)._id.toString();

      const transaction = await this.transactionsService.create({
        propertyId: 'prop-sim-6',
        propertyType: PropertyTypeEnum.SALE,
        totalServiceFee: 10000,
        listingAgentId: agentId,
        sellingAgentId: agentId,
      });
      transactionId = (transaction as any)._id.toString();

      steps.push({
        name: 'setup',
        description: 'Agent ve transaction oluşturuldu',
        success: true,
        duration: 0,
        data: { agentId, transactionId },
      });

      // Geçersiz geçiş dene: AGREEMENT → COMPLETED (atlayarak)
      try {
        await this.transactionsService.updateStage(transactionId, {
          stage: CurrentStageEnum.COMPLETED,
          notes: 'Geçersiz geçiş denemesi',
        });
        errorCount++;
        steps.push({
          name: 'invalid-transition',
          description: 'Geçersiz stage geçişi yapıldı (beklenen hata fırlatılmadı)',
          success: false,
          duration: 0,
          error: 'BadRequestException bekleniyordu ama fırlatılmadı',
        });
      } catch (error) {
        // Beklenen hata
        steps.push({
          name: 'invalid-transition',
          description: 'Geçersiz stage geçişi engellendi (beklenen davranış)',
          success: true,
          duration: 0,
          error: error.message,
        });
        this.logger.error('Simulation error: Invalid transition caught', {
          transactionId,
          error: error.message,
          tags: ['simulation', 'error', 'validation'],
        });
      }

      return {
        scenario: SimulationScenario.ERROR_INVALID_TRANSITION,
        success: errorCount === 0, // Hata yakalandıysa başarılı
        duration: 0,
        steps: [],
        alertCount,
        errorCount,
      };
    } catch (error) {
      errorCount++;
      steps.push({
        name: 'error',
        description: `Hata oluştu: ${error.message}`,
        success: false,
        duration: 0,
        error: error.message,
      });

      return {
        scenario: SimulationScenario.ERROR_INVALID_TRANSITION,
        success: false,
        duration: 0,
        steps: [],
        alertCount,
        errorCount,
      };
    }
  }

  /**
   * Senaryo 7: Hata - Geçersiz Agent
   */
  private async runErrorInvalidAgentScenario(
    steps: ScenarioStep[],
  ): Promise<ScenarioResult> {
    let alertCount = 0;
    let errorCount = 0;

    try {
      // Geçersiz agent ID ile transaction oluşturmayı dene
      try {
        await this.transactionsService.create({
          propertyId: 'prop-sim-7',
          propertyType: PropertyTypeEnum.SALE,
          totalServiceFee: 10000,
          listingAgentId: '507f1f77bcf86cd799439011', // Geçersiz ID
          sellingAgentId: '507f1f77bcf86cd799439012', // Geçersiz ID
        });
        errorCount++;
        steps.push({
          name: 'invalid-agent',
          description: 'Geçersiz agent ID ile transaction oluşturuldu (beklenen hata fırlatılmadı)',
          success: false,
          duration: 0,
          error: 'NotFoundException bekleniyordu ama fırlatılmadı',
        });
      } catch (error) {
        // Beklenen hata
        steps.push({
          name: 'invalid-agent',
          description: 'Geçersiz agent ID engellendi (beklenen davranış)',
          success: true,
          duration: 0,
          error: error.message,
        });
        this.logger.error('Simulation error: Invalid agent caught', {
          error: error.message,
          tags: ['simulation', 'error', 'validation'],
        });
      }

      return {
        scenario: SimulationScenario.ERROR_INVALID_AGENT,
        success: errorCount === 0,
        duration: 0,
        steps: [],
        alertCount,
        errorCount,
      };
    } catch (error) {
      errorCount++;
      steps.push({
        name: 'error',
        description: `Hata oluştu: ${error.message}`,
        success: false,
        duration: 0,
        error: error.message,
      });

      return {
        scenario: SimulationScenario.ERROR_INVALID_AGENT,
        success: false,
        duration: 0,
        steps: [],
        alertCount,
        errorCount,
      };
    }
  }

  /**
   * Senaryo 8: Hata - Aynı Stage'e Geçiş
   */
  private async runErrorSameStageScenario(
    steps: ScenarioStep[],
  ): Promise<ScenarioResult> {
    let agentId: string;
    let transactionId: string;
    let alertCount = 0;
    let errorCount = 0;

    try {
      // Agent ve transaction oluştur
      const agent = await this.agentsService.create({
        name: 'Same Stage Agent',
        email: `samestage-${Date.now()}@simulation.com`,
        phone: '05555555555',
      });
      agentId = (agent as any)._id.toString();

      const transaction = await this.transactionsService.create({
        propertyId: 'prop-sim-8',
        propertyType: PropertyTypeEnum.SALE,
        totalServiceFee: 10000,
        listingAgentId: agentId,
        sellingAgentId: agentId,
      });
      transactionId = (transaction as any)._id.toString();

      steps.push({
        name: 'setup',
        description: 'Agent ve transaction oluşturuldu',
        success: true,
        duration: 0,
        data: { agentId, transactionId },
      });

      // Aynı stage'e geçiş dene
      try {
        await this.transactionsService.updateStage(transactionId, {
          stage: CurrentStageEnum.AGREEMENT, // Zaten AGREEMENT'da
          notes: 'Aynı stage geçişi denemesi',
        });
        errorCount++;
        steps.push({
          name: 'same-stage',
          description: 'Aynı stage geçişi yapıldı (beklenen hata fırlatılmadı)',
          success: false,
          duration: 0,
          error: 'BadRequestException bekleniyordu ama fırlatılmadı',
        });
      } catch (error) {
        // Beklenen hata
        steps.push({
          name: 'same-stage',
          description: 'Aynı stage geçişi engellendi (beklenen davranış)',
          success: true,
          duration: 0,
          error: error.message,
        });
        this.logger.error('Simulation error: Same stage transition caught', {
          transactionId,
          error: error.message,
          tags: ['simulation', 'error', 'validation'],
        });
      }

      return {
        scenario: SimulationScenario.ERROR_SAME_STAGE,
        success: errorCount === 0,
        duration: 0,
        steps: [],
        alertCount,
        errorCount,
      };
    } catch (error) {
      errorCount++;
      steps.push({
        name: 'error',
        description: `Hata oluştu: ${error.message}`,
        success: false,
        duration: 0,
        error: error.message,
      });

      return {
        scenario: SimulationScenario.ERROR_SAME_STAGE,
        success: false,
        duration: 0,
        steps: [],
        alertCount,
        errorCount,
      };
    }
  }

  /**
   * Senaryo 9: Çoklu İşlemler
   */
  private async runMultipleTransactionsScenario(
    steps: ScenarioStep[],
  ): Promise<ScenarioResult> {
    const agentIds: string[] = [];
    const transactionIds: string[] = [];
    let alertCount = 0;
    let errorCount = 0;

    try {
      // 5 Agent oluştur
      const agentsStart = Date.now();
      for (let i = 0; i < 5; i++) {
        const agent = await this.agentsService.create({
          name: `Multi Agent ${i + 1}`,
          email: `multi-${i}-${Date.now()}@simulation.com`,
          phone: `0555${1000000 + i}`,
        });
        agentIds.push((agent as any)._id.toString());
      }
      steps.push({
        name: 'create-agents',
        description: '5 agent oluşturuldu',
        success: true,
        duration: Date.now() - agentsStart,
        data: { agentCount: agentIds.length },
      });

      // 10 Transaction oluştur
      const transactionsStart = Date.now();
      for (let i = 0; i < 10; i++) {
        const listingAgentId = agentIds[i % agentIds.length];
        const sellingAgentId = agentIds[(i + 1) % agentIds.length];

        const transaction = await this.transactionsService.create({
          propertyId: `prop-multi-${i + 1}`,
          propertyType: PropertyTypeEnum.SALE,
          totalServiceFee: 10000 + i * 1000,
          listingAgentId,
          sellingAgentId,
        });
        transactionIds.push((transaction as any)._id.toString());
      }
      steps.push({
        name: 'create-transactions',
        description: '10 transaction oluşturuldu',
        success: true,
        duration: Date.now() - transactionsStart,
        data: { transactionCount: transactionIds.length },
      });

      // Bazı transaction'ları farklı stage'lere güncelle
      const updateStart = Date.now();
      let completedCount = 0;

      for (let i = 0; i < transactionIds.length; i++) {
        const transactionId = transactionIds[i];

        if (i < 3) {
          // İlk 3'ü EARNEST_MONEY yap
          await this.transactionsService.updateStage(transactionId, {
            stage: CurrentStageEnum.EARNEST_MONEY,
            notes: `Transaction ${i + 1} - Kapora ödendi`,
          });
        } else if (i < 6) {
          // Sonraki 3'ü TITLE_DEED yap
          await this.transactionsService.updateStage(transactionId, {
            stage: CurrentStageEnum.EARNEST_MONEY,
            notes: `Transaction ${i + 1} - Kapora ödendi`,
          });
          await this.transactionsService.updateStage(transactionId, {
            stage: CurrentStageEnum.TITLE_DEED,
            notes: `Transaction ${i + 1} - Tapu işlemleri tamamlandı`,
          });
        } else {
          // Son 4'ü COMPLETED yap
          await this.transactionsService.updateStage(transactionId, {
            stage: CurrentStageEnum.EARNEST_MONEY,
            notes: `Transaction ${i + 1} - Kapora ödendi`,
          });
          await this.transactionsService.updateStage(transactionId, {
            stage: CurrentStageEnum.TITLE_DEED,
            notes: `Transaction ${i + 1} - Tapu işlemleri tamamlandı`,
          });
          await this.transactionsService.updateStage(transactionId, {
            stage: CurrentStageEnum.COMPLETED,
            notes: `Transaction ${i + 1} - İşlem tamamlandı`,
          });
          completedCount++;
          alertCount++; // Her COMPLETED bir alert
        }
      }

      steps.push({
        name: 'update-stages',
        description: 'Transaction stage\'leri güncellendi',
        success: true,
        duration: Date.now() - updateStart,
        data: {
          completedCount,
          alertCount,
        },
      });

      // Commission'ları kontrol et
      const commissionStart = Date.now();
      let validCommissions = 0;

      for (const transactionId of transactionIds.slice(6)) {
        // Sadece COMPLETED olanları kontrol et
        try {
          const commission = await this.transactionsService.getCommissionBreakdown(
            transactionId,
          );
          if (commission && commission.agencyAmount > 0) {
            validCommissions++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      steps.push({
        name: 'validate-commissions',
        description: 'Commission hesaplamaları kontrol edildi',
        success: validCommissions === completedCount,
        duration: Date.now() - commissionStart,
        data: {
          validCommissions,
          completedCount,
        },
      });

      if (validCommissions !== completedCount) {
        errorCount++;
      }

      return {
        scenario: SimulationScenario.MULTIPLE_TRANSACTIONS,
        success: errorCount === 0,
        duration: 0,
        steps: [],
        alertCount,
        errorCount,
      };
    } catch (error) {
      errorCount++;
      steps.push({
        name: 'error',
        description: `Hata oluştu: ${error.message}`,
        success: false,
        duration: 0,
        error: error.message,
      });

      return {
        scenario: SimulationScenario.MULTIPLE_TRANSACTIONS,
        success: false,
        duration: 0,
        steps: [],
        alertCount,
        errorCount,
      };
    }
  }
}

