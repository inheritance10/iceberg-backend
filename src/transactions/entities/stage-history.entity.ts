import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { CurrentStageEnum } from "../enums/current-stage.enum";

/* --------------------------------------
 * StageHistory (Embedded Schema)
 * -------------------------------------- */
@Schema({ _id: false })
export class StageHistory {
  @Prop({ required: true, enum: CurrentStageEnum })
  stage: CurrentStageEnum;

  @Prop({ required: true, default: Date.now })
  timestamp: Date;

  @Prop()
  notes?: string;
}

export const StageHistorySchema = SchemaFactory.createForClass(StageHistory);