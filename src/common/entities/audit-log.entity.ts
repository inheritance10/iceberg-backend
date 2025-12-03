import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

/**
 * Audit Action Types
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  READ = 'READ',
  SOFT_DELETE = 'SOFT_DELETE',
}

/**
 * Entity Types
 */
export enum AuditEntityType {
  AGENT = 'Agent',
  TRANSACTION = 'Transaction',
}

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true, enum: AuditAction })
  action: AuditAction;

  @Prop({ required: true, enum: AuditEntityType })
  entityType: AuditEntityType;

  @Prop({ type: String })
  entityId?: string;

  @Prop({ type: String })
  userId?: string; // Eğer auth sistemi varsa

  @Prop({ type: String })
  ipAddress?: string;

  @Prop({ type: String })
  userAgent?: string;

  @Prop({ type: String })
  httpMethod?: string;

  @Prop({ type: String })
  endpoint?: string;

  @Prop({ type: String, required: true })
  requestId: string;

  @Prop({ type: Object })
  before?: Record<string, any>; // Eski veri

  @Prop({ type: Object })
  after?: Record<string, any>; // Yeni veri

  @Prop({ type: [String], default: [] })
  changes?: string[]; // Değişen field'lar

  @Prop({ type: Number })
  statusCode?: number;

  @Prop({ type: String })
  error?: string;

  @Prop({ type: Number })
  duration?: number; // ms cinsinden

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Ek bilgiler
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Index'ler - Hızlı sorgulama için
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ requestId: 1 });
AuditLogSchema.index({ createdAt: -1 });

