import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '../../common/schemas/base.schema';

export type AgentDocument = Agent & Document;

@Schema({ timestamps: true })
export class Agent extends BaseSchema {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phone: string;
}

export const AgentSchema = SchemaFactory.createForClass(Agent);

// Soft delete için index ekle
AgentSchema.index({ deletedAt: 1 });

// Soft delete plugin'ini ekle
import { softDeletePlugin } from '../../common/plugins/soft-delete.plugin';
AgentSchema.plugin(softDeletePlugin);
