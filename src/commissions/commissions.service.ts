import { Injectable, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Transaction } from '../transactions/entities/transaction.entity';
import {
  ICommissionBreakdown,
  IAgentCommission,
} from './interfaces/commission-breakdown.interface';
import { AgentRoleEnum } from '../transactions/enums/agent-role.enum';
import {
  COMMISSION_RATIOS,
  AGENT_PERCENTAGES,
} from './constants/commission.constants';

@Injectable()
export class CommissionsService {
  /**
   * Transaction için komisyon dağılımını hesaplar
   * @param transaction - Komisyonu hesaplanacak transaction
   * @returns Komisyon dağılım detayları
   * @throws BadRequestException - Transaction verileri geçersizse
   */
  calculateCommission(transaction: Transaction): ICommissionBreakdown {
    this.validateTransaction(transaction);

    const agencyAmount = this.calculateAgencyAmount(transaction.totalServiceFee);
    const agentCommissions = this.calculateAgentCommissions(transaction);

    return {
      agencyAmount,
      agents: agentCommissions,
      calculatedAt: new Date(),
    };
  }

  /**
   * Şirket payını hesaplar
   * @param totalFee - Toplam hizmet ücreti
   * @returns Şirket payı
   */
  private calculateAgencyAmount(totalFee: number): number {
    return totalFee * COMMISSION_RATIOS.AGENCY;
  }

  /**
   * Acentelerin komisyon dağılımını hesaplar
   * @param transaction - Transaction bilgileri
   * @returns Acente komisyon listesi
   */
  private calculateAgentCommissions(
    transaction: Transaction,
  ): IAgentCommission[] {
    const isSameAgent = this.isSameAgent(
      transaction.listingAgentId,
      transaction.sellingAgentId,
    );

    if (isSameAgent) {
      return this.calculateSameAgentCommission(transaction);
    }

    return this.calculateDifferentAgentsCommission(transaction);
  }

  /**
   * Listing ve selling agent'ın aynı kişi olup olmadığını kontrol eder
   */
  private isSameAgent(
    listingAgentId: Types.ObjectId,
    sellingAgentId: Types.ObjectId,
  ): boolean {
    return listingAgentId.toString() === sellingAgentId.toString();
  }

  /**
   * Aynı acente senaryosu için komisyon hesaplar
   * Acente toplam agent payının %100'ünü alır (toplamın %50'si)
   */
  private calculateSameAgentCommission(
    transaction: Transaction,
  ): IAgentCommission[] {
    const agentPortion = transaction.totalServiceFee * COMMISSION_RATIOS.AGENTS;

    return [
      {
        agentId: transaction.listingAgentId,
        amount: agentPortion,
        role: AgentRoleEnum.BOTH,
        percentage: AGENT_PERCENTAGES.SAME_AGENT,
      },
    ];
  }

  /**
   * Farklı acenteler senaryosu için komisyon hesaplar
   * Her acente agent payının %50'sini alır (toplamın %25'i)
   */
  private calculateDifferentAgentsCommission(
    transaction: Transaction,
  ): IAgentCommission[] {
    const agentPortion = transaction.totalServiceFee * COMMISSION_RATIOS.AGENTS;
    const individualAgentAmount = agentPortion * COMMISSION_RATIOS.AGENT_SPLIT;

    return [
      {
        agentId: transaction.listingAgentId,
        amount: individualAgentAmount,
        role: AgentRoleEnum.LISTING,
        percentage: AGENT_PERCENTAGES.DIFFERENT_AGENTS,
      },
      {
        agentId: transaction.sellingAgentId,
        amount: individualAgentAmount,
        role: AgentRoleEnum.SELLING,
        percentage: AGENT_PERCENTAGES.DIFFERENT_AGENTS,
      },
    ];
  }

  /**
   * Transaction verilerinin geçerliliğini kontrol eder
   * @param transaction - Kontrol edilecek transaction
   * @throws BadRequestException - Veriler geçersizse
   */
  private validateTransaction(transaction: Transaction): void {
    if (!transaction.totalServiceFee || transaction.totalServiceFee <= 0) {
      throw new BadRequestException(
        'Transaction must have a valid totalServiceFee greater than 0',
      );
    }

    if (!transaction.listingAgentId) {
      throw new BadRequestException('Transaction must have a listingAgentId');
    }

    if (!transaction.sellingAgentId) {
      throw new BadRequestException('Transaction must have a sellingAgentId');
    }
  }
}
