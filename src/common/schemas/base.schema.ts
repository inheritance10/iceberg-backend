import { Prop } from '@nestjs/mongoose';

/**
 * Base Schema
 * Tüm entity'lerde ortak olan field'ları içerir
 * Soft delete desteği sağlar
 */
export abstract class BaseSchema {
  @Prop({ type: Date, default: null })
  deletedAt?: Date;

  @Prop({ type: Boolean, default: false })
  deleted?: boolean;
}

