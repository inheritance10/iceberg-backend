import { SetMetadata } from '@nestjs/common';
import {
  AuditAction,
  AuditEntityType,
} from '../entities/audit-log.entity';

export const AUDIT_LOG_KEY = 'audit_log';

export interface AuditLogOptions {
  action: AuditAction;
  entityType: AuditEntityType;
  skipResponse?: boolean; // Response'u loglamayı atla
}

/**
 * Audit Log Decorator
 * Metod seviyesinde audit logging'i aktif eder
 * 
 * @example
 * @AuditLog({ action: AuditAction.CREATE, entityType: AuditEntityType.AGENT })
 * async create(@Body() dto: CreateAgentDto) { ... }
 */
export const AuditLog = (options: AuditLogOptions) =>
  SetMetadata(AUDIT_LOG_KEY, options);

