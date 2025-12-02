import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { AgentCommissionSchema } from "./agent-commission.entity";
import { AgentCommission } from "./agent-commission.entity";

/* --------------------------------------
 * CommissionBreakdown (Embedded Schema)
 * -------------------------------------- */
@Schema({ _id: false })
export class CommissionBreakdown {
  @Prop({ required: true, min: 0 })
  agencyAmount: number;

  @Prop({ type: [AgentCommissionSchema], default: [] })
  agents: AgentCommission[];

  @Prop({ required: true, default: Date.now })
  calculatedAt: Date;
}

export const CommissionBreakdownSchema = SchemaFactory.createForClass(CommissionBreakdown);
