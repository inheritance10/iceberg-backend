import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionDocument } from './entities/transaction.entity';
import { CommissionsService } from '../commissions/commissions.service';
import { ValidationService } from '../common/services/validation.service';
import { StageValidationService } from './services/stage-validation.service';
import { Model } from 'mongoose';
import { Types } from 'mongoose';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionStageDto } from './dto/update-transaction-stage.dto';
import { PropertyTypeEnum } from './enums/property-type.enum';
import { CurrentStageEnum } from './enums/current-stage.enum';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionModel: Model<TransactionDocument>;
  let commissionsService: CommissionsService;
  let validationService: ValidationService;
  let stageValidationService: StageValidationService;

  const mockListingAgentId = new Types.ObjectId();
  const mockSellingAgentId = new Types.ObjectId();
  const mockTransaction = {
    _id: new Types.ObjectId(),
    propertyId: 'prop-123',
    propertyType: PropertyTypeEnum.SALE,
    totalServiceFee: 10000,
    listingAgentId: mockListingAgentId,
    sellingAgentId: mockSellingAgentId,
    currentStage: CurrentStageEnum.AGREEMENT,
    stageHistory: [
      {
        stage: CurrentStageEnum.AGREEMENT,
        timestamp: new Date(),
        notes: 'Transaction created',
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock Model - constructor ve static methods
  const mockTransactionModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };

  const mockCommissionsService = {
    calculateCommission: jest.fn(),
  };

  const mockValidationService = {
    validateAgents: jest.fn(),
  };

  const mockStageValidationService = {
    validateTransition: jest.fn(),
    isCompleted: jest.fn(),
    isNotCompleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getModelToken(Transaction.name),
          useValue: mockTransactionModel,
        },
        {
          provide: CommissionsService,
          useValue: mockCommissionsService,
        },
        {
          provide: ValidationService,
          useValue: mockValidationService,
        },
        {
          provide: StageValidationService,
          useValue: mockStageValidationService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionModel = module.get<Model<TransactionDocument>>(
      getModelToken(Transaction.name),
    );
    commissionsService = module.get<CommissionsService>(CommissionsService);
    validationService = module.get<ValidationService>(ValidationService);
    stageValidationService = module.get<StageValidationService>(
      StageValidationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a transaction successfully', async () => {
      // Arrange
      const createTransactionDto: CreateTransactionDto = {
        propertyId: 'prop-123',
        propertyType: PropertyTypeEnum.SALE,
        totalServiceFee: 10000,
        listingAgentId: mockListingAgentId.toString(),
        sellingAgentId: mockSellingAgentId.toString(),
      };

      const savedTransaction = {
        ...mockTransaction,
        save: jest.fn().mockResolvedValue(mockTransaction),
      };

      mockValidationService.validateAgents.mockResolvedValue(undefined);
      
      // Mock constructor
      const MockModel = jest.fn().mockImplementation((dto) => savedTransaction);
      (transactionModel as any).constructor = MockModel;
      (service as any).transactionModel = MockModel;

      // Act
      const result = await service.create(createTransactionDto);

      // Assert
      expect(result).toEqual(mockTransaction);
      expect(mockValidationService.validateAgents).toHaveBeenCalled();
      expect(MockModel).toHaveBeenCalled();
      expect(savedTransaction.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when agent not found', async () => {
      // Arrange
      const createTransactionDto: CreateTransactionDto = {
        propertyId: 'prop-123',
        propertyType: PropertyTypeEnum.SALE,
        totalServiceFee: 10000,
        listingAgentId: mockListingAgentId.toString(),
        sellingAgentId: mockSellingAgentId.toString(),
      };

      mockValidationService.validateAgents.mockRejectedValue(
        new NotFoundException('Agent not found'),
      );

      // Act & Assert
      await expect(service.create(createTransactionDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStage', () => {
    it('should update stage successfully', async () => {
      // Arrange
      const transactionId = mockTransaction._id.toString();
      const updateStageDto: UpdateTransactionStageDto = {
        stage: CurrentStageEnum.EARNEST_MONEY,
        notes: 'Kapora ödendi',
      };

      const updatedTransaction = {
        ...mockTransaction,
        currentStage: CurrentStageEnum.EARNEST_MONEY,
        stageHistory: [
          ...mockTransaction.stageHistory,
          {
            stage: CurrentStageEnum.EARNEST_MONEY,
            timestamp: new Date(),
            notes: 'Kapora ödendi',
          },
        ],
      };

      mockTransactionModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTransaction),
          }),
        }),
      });

      mockStageValidationService.validateTransition.mockReturnValue(undefined);
      mockStageValidationService.isCompleted.mockReturnValue(false);

      mockTransactionModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(updatedTransaction),
          }),
        }),
      });

      // Act
      const result = await service.updateStage(transactionId, updateStageDto);

      // Assert
      expect(result).toEqual(updatedTransaction);
      expect(mockStageValidationService.validateTransition).toHaveBeenCalledWith(
        CurrentStageEnum.AGREEMENT,
        CurrentStageEnum.EARNEST_MONEY,
      );
    });

    it('should calculate commission when stage is COMPLETED', async () => {
      // Arrange
      const transactionId = mockTransaction._id.toString();
      const updateStageDto: UpdateTransactionStageDto = {
        stage: CurrentStageEnum.COMPLETED,
        notes: 'İşlem tamamlandı',
      };

      const commissionBreakdown = {
        agencyAmount: 5000,
        agents: [
          {
            agentId: mockListingAgentId,
            amount: 5000,
            role: 'BOTH',
            percentage: 50,
          },
        ],
        calculatedAt: new Date(),
      };

      mockTransactionModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTransaction),
          }),
        }),
      });

      mockStageValidationService.validateTransition.mockReturnValue(undefined);
      mockStageValidationService.isCompleted.mockReturnValue(true);
      mockCommissionsService.calculateCommission.mockReturnValue(
        commissionBreakdown,
      );

      const updatedTransaction = {
        ...mockTransaction,
        currentStage: CurrentStageEnum.COMPLETED,
        commissionBreakdown,
      };

      mockTransactionModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(updatedTransaction),
          }),
        }),
      });

      // Act
      const result = await service.updateStage(transactionId, updateStageDto);

      // Assert
      expect(result.commissionBreakdown).toBeDefined();
      expect(mockCommissionsService.calculateCommission).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid stage transition', async () => {
      // Arrange
      const transactionId = mockTransaction._id.toString();
      const updateStageDto: UpdateTransactionStageDto = {
        stage: CurrentStageEnum.COMPLETED, // AGREEMENT'dan direkt COMPLETED'e geçiş
        notes: 'Invalid transition',
      };

      mockTransactionModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTransaction),
          }),
        }),
      });

      mockStageValidationService.validateTransition.mockImplementation(() => {
        throw new BadRequestException('Invalid transition');
      });

      // Act & Assert
      await expect(
        service.updateStage(transactionId, updateStageDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCommissionBreakdown', () => {
    it('should return commission breakdown for completed transaction', async () => {
      // Arrange
      const transactionId = mockTransaction._id.toString();
      const completedTransaction = {
        ...mockTransaction,
        currentStage: CurrentStageEnum.COMPLETED,
        commissionBreakdown: {
          agencyAmount: 5000,
          agents: [
            {
              agentId: mockListingAgentId,
              amount: 5000,
              role: 'BOTH',
              percentage: 50,
            },
          ],
          calculatedAt: new Date(),
        },
      };

      mockTransactionModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(completedTransaction),
          }),
        }),
      });

      mockStageValidationService.isNotCompleted.mockReturnValue(false);

      // Act
      const result = await service.getCommissionBreakdown(transactionId);

      // Assert
      expect(result.agencyAmount).toBe(5000);
      expect(result.agents).toHaveLength(1);
    });

    it('should throw BadRequestException when transaction is not completed', async () => {
      // Arrange
      const transactionId = mockTransaction._id.toString();

      mockTransactionModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTransaction),
          }),
        }),
      });

      mockStageValidationService.isNotCompleted.mockReturnValue(true);

      // Act & Assert
      await expect(
        service.getCommissionBreakdown(transactionId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate and save commission if not exists', async () => {
      // Arrange
      const transactionId = mockTransaction._id.toString();
      const completedTransaction = {
        ...mockTransaction,
        currentStage: CurrentStageEnum.COMPLETED,
        commissionBreakdown: undefined,
      };

      const commissionBreakdown = {
        agencyAmount: 5000,
        agents: [
          {
            agentId: mockListingAgentId,
            amount: 5000,
            role: 'BOTH',
            percentage: 50,
          },
        ],
        calculatedAt: new Date(),
      };

      mockTransactionModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(completedTransaction),
          }),
        }),
      });

      mockStageValidationService.isNotCompleted.mockReturnValue(false);
      mockCommissionsService.calculateCommission.mockReturnValue(
        commissionBreakdown,
      );
      mockTransactionModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(undefined),
      });

      // Act
      const result = await service.getCommissionBreakdown(transactionId);

      // Assert
      expect(result).toEqual(commissionBreakdown);
      expect(mockCommissionsService.calculateCommission).toHaveBeenCalled();
    });
  });
});
