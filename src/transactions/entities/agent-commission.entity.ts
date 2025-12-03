import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { AgentRoleEnum } from "../enums/agent-role.enum";
import { Types } from "mongoose";

/* --------------------------------------
 * AgentCommission (Embedded Schema)
 * -------------------------------------- */
@Schema({ _id: false })
export class AgentCommission {
  @Prop({ type: Types.ObjectId, ref: 'Agent', required: true })
  agentId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ type: String, required: true, enum: AgentRoleEnum })
  role: AgentRoleEnum;

  @Prop({ required: true, min: 0 })
  percentage: number;
}    

export const AgentCommissionSchema = SchemaFactory.createForClass(AgentCommission);