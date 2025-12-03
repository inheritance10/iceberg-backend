import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
  AuditLog,
  AuditLogDocument,
  AuditAction,
  AuditEntityType,
} from '../entities/audit-log.entity';

export interface AuditLogData {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  httpMethod?: string;
  endpoint?: string;
  requestId: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  changes?: string[];
  statusCode?: number;
  error?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Audit log kaydeder
   * @param data - Audit log verisi
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      // MongoDB'ye kaydet
      const auditLog = new this.auditLogModel(data);
      await auditLog.save();

      // Winston logger'a da yaz (file logging)
      this.logger.info('Audit Log', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Audit log kaydetme hatası - kritik hata, console'a yaz
      console.error('Failed to save audit log:', error);
      this.logger.error('Failed to save audit log', {
        error: error.message,
        data,
      });
    }
  }

  /**
   * Entity değişikliklerini tespit eder
   * @param before - Önceki veri
   * @param after - Sonraki veri
   * @returns Değişen field'ların listesi
   */
  detectChanges(
    before?: Record<string, any>,
    after?: Record<string, any>,
  ): string[] {
    if (!before || !after) {
      return [];
    }

    const changes: string[] = [];
    const allKeys = new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ]);

    for (const key of allKeys) {
      // Sensitive field'ları atla
      if (this.isSensitiveField(key)) {
        continue;
      }

      const beforeValue = this.serializeValue(before[key]);
      const afterValue = this.serializeValue(after[key]);

      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        changes.push(key);
      }
    }

    return changes;
  }

  /**
   * Sensitive field kontrolü
   * @param fieldName - Field adı
   * @returns Sensitive field mı?
   */
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
    return sensitiveFields.some((field) =>
      fieldName.toLowerCase().includes(field),
    );
  }

  /**
   * Değeri serialize eder (ObjectId, Date vb. için)
   * @param value - Değer
   * @returns Serialize edilmiş değer
   */
  private serializeValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // ObjectId
    if (value.toString && value.constructor?.name === 'ObjectID') {
      return value.toString();
    }

    // Date
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Object
    if (typeof value === 'object' && !Array.isArray(value)) {
      const serialized: Record<string, any> = {};
      for (const key in value) {
        serialized[key] = this.serializeValue(value[key]);
      }
      return serialized;
    }

    // Array
    if (Array.isArray(value)) {
      return value.map((item) => this.serializeValue(item));
    }

    return value;
  }

  /**
   * Entity'den audit log için güvenli kopya oluşturur
   * (Sensitive field'ları temizler)
   * @param entity - Entity
   * @returns Güvenli kopya
   */
  sanitizeEntity(entity: any): Record<string, any> {
    if (!entity) {
      return {};
    }

    const sanitized: Record<string, any> = {};
    const entityObj = entity.toObject ? entity.toObject() : entity;

    for (const key in entityObj) {
      if (this.isSensitiveField(key)) {
        continue;
      }

      sanitized[key] = this.serializeValue(entityObj[key]);
    }

    return sanitized;
  }
}

