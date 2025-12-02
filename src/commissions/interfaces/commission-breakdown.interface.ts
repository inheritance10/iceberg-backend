import { Types } from 'mongoose';
import { AgentRoleEnum } from '../../transactions/enums/agent-role.enum';

/**
 * Agent Commission Interface
 * Her bir acentenin komisyon bilgilerini temsil eder
 */
export interface IAgentCommission {
  agentId: Types.ObjectId | string;
  amount: number;
  role: AgentRoleEnum;
  percentage: number;
}

/**
 * Commission Breakdown Interface
 * İşlem tamamlandığında hesaplanan komisyon dağılımını temsil eder
 * Bu interface, commissions service'inde kullanılır ve API response'larında tip güvenliği sağlar
 */
export interface ICommissionBreakdown {
  agencyAmount: number;
  agents: IAgentCommission[];
  calculatedAt: Date;
}

