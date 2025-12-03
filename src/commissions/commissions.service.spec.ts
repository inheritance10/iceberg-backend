import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { Transaction } from '../transactions/entities/transaction.entity';
import { PropertyTypeEnum } from '../transactions/enums/property-type.enum';
import { CurrentStageEnum } from '../transactions/enums/current-stage.enum';
import { AgentRoleEnum } from '../transactions/enums/agent-role.enum';
import { Types } from 'mongoose';

describe('CommissionsService', () => {
  let service: CommissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommissionsService],
    }).compile();

    service = module.get<CommissionsService>(CommissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateCommission', () => {
    // Senaryo 1: Aynı acente (listing = selling)
    it('should calculate commission correctly when listing and selling agent are the same', () => {
      // Arrange
      const agentId = new Types.ObjectId();
      const transaction: Partial<Transaction> = {
        totalServiceFee: 10000,
        listingAgentId: agentId,
        sellingAgentId: agentId,
        propertyId: 'prop-1',
        propertyType: PropertyTypeEnum.SALE,
        currentStage: CurrentStageEnum.AGREEMENT,
      };

      // Act
      const result = service.calculateCommission(transaction as Transaction);

      // Assert
      expect(result.agencyAmount).toBe(5000); // %50
      expect(result.agents).toHaveLength(1);
      expect(result.agents[0].agentId.toString()).toBe(agentId.toString());
      expect(result.agents[0].amount).toBe(5000); // %50
      expect(result.agents[0].role).toBe(AgentRoleEnum.BOTH);
      expect(result.agents[0].percentage).toBe(50);
      expect(result.calculatedAt).toBeInstanceOf(Date);
    });

    // Senaryo 2: Farklı acenteler
    it('should calculate commission correctly when listing and selling agents are different', () => {
      // Arrange
      const listingAgentId = new Types.ObjectId();
      const sellingAgentId = new Types.ObjectId();
      const transaction: Partial<Transaction> = {
        totalServiceFee: 10000,
        listingAgentId,
        sellingAgentId,
        propertyId: 'prop-1',
        propertyType: PropertyTypeEnum.SALE,
        currentStage: CurrentStageEnum.AGREEMENT,
      };

      // Act
      const result = service.calculateCommission(transaction as Transaction);

      // Assert
      expect(result.agencyAmount).toBe(5000); // %50
      expect(result.agents).toHaveLength(2);

      // Listing Agent
      expect(result.agents[0].agentId.toString()).toBe(
        listingAgentId.toString(),
      );
      expect(result.agents[0].amount).toBe(2500); // %25
      expect(result.agents[0].role).toBe(AgentRoleEnum.LISTING);
      expect(result.agents[0].percentage).toBe(25);

      // Selling Agent
      expect(result.agents[1].agentId.toString()).toBe(
        sellingAgentId.toString(),
      );
      expect(result.agents[1].amount).toBe(2500); // %25
      expect(result.agents[1].role).toBe(AgentRoleEnum.SELLING);
      expect(result.agents[1].percentage).toBe(25);
    });

    // Edge Case 1: Sıfır komisyon - Validation hatası fırlatmalı
    it('should throw BadRequestException for zero commission', () => {
      // Arrange
      const agentId = new Types.ObjectId();
      const transaction: Partial<Transaction> = {
        totalServiceFee: 0,
        listingAgentId: agentId,
        sellingAgentId: agentId,
        propertyId: 'prop-1',
        propertyType: PropertyTypeEnum.SALE,
        currentStage: CurrentStageEnum.AGREEMENT,
      };

      // Act & Assert
      expect(() =>
        service.calculateCommission(transaction as Transaction),
      ).toThrow(BadRequestException);
    });

    // Edge Case 2: Çok büyük komisyon
    it('should handle large commission amounts correctly', () => {
      // Arrange
      const agentId = new Types.ObjectId();
      const transaction: Partial<Transaction> = {
        totalServiceFee: 1000000, // 1,000,000 TL
        listingAgentId: agentId,
        sellingAgentId: agentId,
        propertyId: 'prop-1',
        propertyType: PropertyTypeEnum.SALE,
        currentStage: CurrentStageEnum.AGREEMENT,
      };

      // Act
      const result = service.calculateCommission(transaction as Transaction);

      // Assert
      expect(result.agencyAmount).toBe(500000);
      expect(result.agents[0].amount).toBe(500000);
    });

    // Edge Case 3: Rental property
    it('should calculate commission correctly for rental properties', () => {
      // Arrange
      const agentId = new Types.ObjectId();
      const transaction: Partial<Transaction> = {
        totalServiceFee: 5000,
        listingAgentId: agentId,
        sellingAgentId: agentId,
        propertyId: 'prop-1',
        propertyType: PropertyTypeEnum.RENT,
        currentStage: CurrentStageEnum.AGREEMENT,
      };

      // Act
      const result = service.calculateCommission(transaction as Transaction);

      // Assert
      expect(result.agencyAmount).toBe(2500);
      expect(result.agents[0].amount).toBe(2500);
    });

    // Validation: Negatif değer
    it('should throw BadRequestException for negative totalServiceFee', () => {
      // Arrange
      const agentId = new Types.ObjectId();
      const transaction: Partial<Transaction> = {
        totalServiceFee: -1000,
        listingAgentId: agentId,
        sellingAgentId: agentId,
        propertyId: 'prop-1',
        propertyType: PropertyTypeEnum.SALE,
        currentStage: CurrentStageEnum.AGREEMENT,
      };

      // Act & Assert
      expect(() =>
        service.calculateCommission(transaction as Transaction),
      ).toThrow(BadRequestException);
    });

    // Validation: Missing listingAgentId
    it('should throw BadRequestException when listingAgentId is missing', () => {
      // Arrange
      const agentId = new Types.ObjectId();
      const transaction: Partial<Transaction> = {
        totalServiceFee: 10000,
        listingAgentId: undefined as any,
        sellingAgentId: agentId,
        propertyId: 'prop-1',
        propertyType: PropertyTypeEnum.SALE,
        currentStage: CurrentStageEnum.AGREEMENT,
      };

      // Act & Assert
      expect(() =>
        service.calculateCommission(transaction as Transaction),
      ).toThrow(BadRequestException);
    });

    // Validation: Missing sellingAgentId
    it('should throw BadRequestException when sellingAgentId is missing', () => {
      // Arrange
      const agentId = new Types.ObjectId();
      const transaction: Partial<Transaction> = {
        totalServiceFee: 10000,
        listingAgentId: agentId,
        sellingAgentId: undefined as any,
        propertyId: 'prop-1',
        propertyType: PropertyTypeEnum.SALE,
        currentStage: CurrentStageEnum.AGREEMENT,
      };

      // Act & Assert
      expect(() =>
        service.calculateCommission(transaction as Transaction),
      ).toThrow(BadRequestException);
    });

    // Validation: Zero totalServiceFee - Validation hatası fırlatmalı
    it('should throw BadRequestException for zero totalServiceFee', () => {
      // Arrange
      const agentId = new Types.ObjectId();
      const transaction: Partial<Transaction> = {
        totalServiceFee: 0,
        listingAgentId: agentId,
        sellingAgentId: agentId,
        propertyId: 'prop-1',
        propertyType: PropertyTypeEnum.SALE,
        currentStage: CurrentStageEnum.AGREEMENT,
      };

      // Act & Assert
      expect(() =>
        service.calculateCommission(transaction as Transaction),
      ).toThrow(BadRequestException);
    });
  });
});
