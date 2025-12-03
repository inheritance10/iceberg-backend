import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { UpdateTransactionStageDto } from './dto/update-transaction-stage.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { PropertyTypeEnum } from './enums/property-type.enum';
import { CurrentStageEnum } from './enums/current-stage.enum';
import { Types } from 'mongoose';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: TransactionsService;

  const mockTransaction = {
    _id: new Types.ObjectId(),
    propertyId: 'prop-123',
    propertyType: PropertyTypeEnum.SALE,
    totalServiceFee: 10000,
    listingAgentId: new Types.ObjectId(),
    sellingAgentId: new Types.ObjectId(),
    currentStage: CurrentStageEnum.AGREEMENT,
    stageHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransactionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStage: jest.fn(),
    getCommissionBreakdown: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    service = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a transaction', async () => {
      // Arrange
      const createTransactionDto: CreateTransactionDto = {
        propertyId: 'prop-123',
        propertyType: PropertyTypeEnum.SALE,
        totalServiceFee: 10000,
        listingAgentId: new Types.ObjectId().toString(),
        sellingAgentId: new Types.ObjectId().toString(),
      };

      mockTransactionsService.create.mockResolvedValue(mockTransaction);

      // Act
      const result = await controller.create(createTransactionDto);

      // Assert
      expect(result).toEqual(mockTransaction);
      expect(mockTransactionsService.create).toHaveBeenCalledWith(
        createTransactionDto,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of transactions', async () => {
      // Arrange
      const transactions = [mockTransaction];
      const queryDto: TransactionQueryDto = {
        page: 1,
        limit: 10,
      };

      mockTransactionsService.findAll.mockResolvedValue({
        data: transactions,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      // Act
      const result = await controller.findAll(queryDto);

      // Assert
      expect(result.data).toEqual(transactions);
      expect(mockTransactionsService.findAll).toHaveBeenCalledWith(queryDto);
    });
  });

  describe('findOne', () => {
    it('should return a transaction by id', async () => {
      // Arrange
      const transactionId = mockTransaction._id.toString();
      mockTransactionsService.findOne.mockResolvedValue(mockTransaction);

      // Act
      const result = await controller.findOne(transactionId);

      // Assert
      expect(result).toEqual(mockTransaction);
      expect(mockTransactionsService.findOne).toHaveBeenCalledWith(
        transactionId,
      );
    });
  });

  describe('update', () => {
    it('should update a transaction', async () => {
      // Arrange
      const transactionId = mockTransaction._id.toString();
      const updateTransactionDto: UpdateTransactionDto = {
        propertyId: 'prop-456',
      };

      const updatedTransaction = {
        ...mockTransaction,
        ...updateTransactionDto,
      };

      mockTransactionsService.update.mockResolvedValue(updatedTransaction);

      // Act
      const result = await controller.update(
        transactionId,
        updateTransactionDto,
      );

      // Assert
      expect(result).toEqual(updatedTransaction);
      expect(mockTransactionsService.update).toHaveBeenCalledWith(
        transactionId,
        updateTransactionDto,
      );
    });
  });

  describe('updateStage', () => {
    it('should update transaction stage', async () => {
      // Arrange
      const transactionId = mockTransaction._id.toString();
      const updateStageDto: UpdateTransactionStageDto = {
        stage: CurrentStageEnum.EARNEST_MONEY,
        notes: 'Kapora ödendi',
      };

      const updatedTransaction = {
        ...mockTransaction,
        currentStage: CurrentStageEnum.EARNEST_MONEY,
      };

      mockTransactionsService.updateStage.mockResolvedValue(updatedTransaction);

      // Act
      const result = await controller.updateStage(transactionId, updateStageDto);

      // Assert
      expect(result).toEqual(updatedTransaction);
      expect(mockTransactionsService.updateStage).toHaveBeenCalledWith(
        transactionId,
        updateStageDto,
      );
    });
  });

  describe('getCommissionBreakdown', () => {
    it('should return commission breakdown', async () => {
      // Arrange
      const transactionId = mockTransaction._id.toString();
      const commissionBreakdown = {
        agencyAmount: 5000,
        agents: [
          {
            agentId: new Types.ObjectId(),
            amount: 5000,
            role: 'BOTH',
            percentage: 50,
          },
        ],
        calculatedAt: new Date(),
      };

      mockTransactionsService.getCommissionBreakdown.mockResolvedValue(
        commissionBreakdown,
      );

      // Act
      const result = await controller.getCommissionBreakdown(transactionId);

      // Assert
      expect(result).toEqual(commissionBreakdown);
      expect(
        mockTransactionsService.getCommissionBreakdown,
      ).toHaveBeenCalledWith(transactionId);
    });
  });

  describe('remove', () => {
    it('should remove a transaction', async () => {
      // Arrange
      const transactionId = mockTransaction._id.toString();
      mockTransactionsService.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove(transactionId);

      // Assert
      expect(mockTransactionsService.remove).toHaveBeenCalledWith(
        transactionId,
      );
    });
  });
});
