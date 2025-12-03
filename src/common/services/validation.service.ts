import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentsService } from '../../agents/agents.service';

/**
 * Validation Service
 * Ortak validation işlemlerini yönetir
 */
@Injectable()
export class ValidationService {
  constructor(private readonly agentsService: AgentsService) {}

  /**
   * Agent'ların var olduğunu kontrol eder
   * @param listingAgentId - Listing agent ID
   * @param sellingAgentId - Selling agent ID
   * @throws NotFoundException - Agent bulunamazsa
   */
  async validateAgents(
    listingAgentId: string,
    sellingAgentId: string,
  ): Promise<void> {
    await this.agentsService.findOne(listingAgentId);
    await this.agentsService.findOne(sellingAgentId);
  }
}

