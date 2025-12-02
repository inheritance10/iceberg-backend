import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CurrentStageEnum } from '../enums/current-stage.enum';
import { PropertyTypeEnum } from '../enums/property-type.enum';
import { StageHistory, StageHistorySchema } from './stage-history.entity';
import { CommissionBreakdown, CommissionBreakdownSchema } from './commission-breakdown.entity';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ required: true })
  propertyId: string;

  @Prop({ required: true, enum: PropertyTypeEnum })
  propertyType: PropertyTypeEnum;

  @Prop({ required: true, min: 0 })
  totalServiceFee: number;

  @Prop({ type: Types.ObjectId, ref: 'Agent', required: true })
  listingAgentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Agent', required: true })
  sellingAgentId: Types.ObjectId;

  @Prop({
    required: true,
    enum: CurrentStageEnum,
    default: CurrentStageEnum.AGREEMENT,
  })
  currentStage: CurrentStageEnum;

  @Prop({ type: [StageHistorySchema], default: [] })
  stageHistory: StageHistory[];

  @Prop({ type: CommissionBreakdownSchema })
  commissionBreakdown?: CommissionBreakdown;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
