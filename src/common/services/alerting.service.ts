import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { AuditAction, AuditEntityType } from '../entities/audit-log.entity';

/**
 * Alerting Service
 * Kritik işlemler için alert kuralları yönetir
 */
@Injectable()
export class AlertingService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Kritik işlem kontrolü ve alert gönderimi
   * @param action - İşlem tipi
   * @param entityType - Entity tipi
   * @param entityId - Entity ID
   * @param metadata - Ek bilgiler
   */
  async checkAndAlert(
    action: AuditAction,
    entityType: AuditEntityType,
    entityId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    // Kritik işlem kontrolü
    if (this.isCriticalAction(action, entityType, metadata)) {
      await this.sendAlert(action, entityType, entityId, metadata);
    }
  }

  /**
   * Kritik işlem mi kontrol eder
   */
  private isCriticalAction(
    action: AuditAction,
    entityType: AuditEntityType,
    metadata?: Record<string, any>,
  ): boolean {
    // DELETE ve SOFT_DELETE işlemleri her zaman kritik bir işlemdir.
    if (
      action === AuditAction.DELETE ||
      action === AuditAction.SOFT_DELETE
    ) {
      return true;
    }

    // Transaction completed işlemi kritik bir işlemdir.
    if (
      entityType === AuditEntityType.TRANSACTION &&
      action === AuditAction.UPDATE &&
      metadata &&
      metadata.stage === 'COMPLETED'
    ) {
      return true;
    }

    // Büyük miktarlı transaction'lar kritik bir işlemdir.
    if (
      entityType === AuditEntityType.TRANSACTION &&
      metadata &&
      metadata.totalServiceFee &&
      metadata.totalServiceFee > 100000 // 100,000 TL üzeri
    ) {
      return true;
    }

    return false;
  }

  /**
   * Alert gönderir
   */
  private async sendAlert(
    action: AuditAction,
    entityType: AuditEntityType,
    entityId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const alertMessage = {
      level: 'alert',
      action,
      entityType,
      entityId,
      message: `Critical action detected: ${action} on ${entityType}`,
      metadata,
      timestamp: new Date().toISOString(),
    };

    // Winston logger'a yaz (Loki'ye gönderilecek)
    // warn level kullanıyoruz çünkü alert'ler kritik uyarılardır
    this.logger.warn(alertMessage.message, {
      ...alertMessage,
      tags: ['alert', 'critical'],
    });

    // Burada email, Slack, SMS gibi alert mekanizmaları eklenebilir
    // Örnek: await this.emailService.sendAlert(alertMessage);
    // Örnek: await this.slackService.sendAlert(alertMessage);
  }

  /**
   * Hata durumları için alert
   */
  async alertError(
    error: Error,
    context?: Record<string, any>,
  ): Promise<void> {
    const alertMessage = {
      level: 'error',
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    };

    this.logger.error('Critical error occurred', alertMessage);
  }

  /**
   * Performans uyarıları
   */
  async alertPerformance(
    duration: number,
    endpoint: string,
    threshold: number = 5000, // 5 saniye
  ): Promise<void> {
    if (duration > threshold) {
      const alertMessage = {
        level: 'warn',
        message: `Slow request detected: ${endpoint} took ${duration}ms`,
        duration,
        endpoint,
        threshold,
        timestamp: new Date().toISOString(),
      };

      this.logger.warn(alertMessage.message, alertMessage);
    }
  }
}

