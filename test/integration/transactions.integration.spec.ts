import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model, Connection } from 'mongoose';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { TransactionsModule } from '../../src/transactions/transactions.module';
import { AgentsModule } from '../../src/agents/agents.module';
import { CommissionsModule } from '../../src/commissions/commissions.module';
import { CommonModule } from '../../src/common/common.module';
import { Transaction, TransactionDocument } from '../../src/transactions/entities/transaction.entity';
import { Agent, AgentDocument } from '../../src/agents/entities/agent.entity';
import { TransactionsService } from '../../src/transactions/transactions.service';
import { AgentsService } from '../../src/agents/agents.service';
import { CommissionsService } from '../../src/commissions/commissions.service';
import { PropertyTypeEnum } from '../../src/transactions/enums/property-type.enum';
import { CurrentStageEnum } from '../../src/transactions/enums/current-stage.enum';
import { CreateTransactionDto } from '../../src/transactions/dto/create-transaction.dto';
import { UpdateTransactionStageDto } from '../../src/transactions/dto/update-transaction-stage.dto';

describe('Transactions Integration Tests', () => {
  let module: TestingModule;
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let transactionsService: TransactionsService;
  let agentsService: AgentsService;
  let commissionsService: CommissionsService;
  let transactionModel: Model<TransactionDocument>;
  let agentModel: Model<AgentDocument>;

  let listingAgentId: string;
  let sellingAgentId: string;

  beforeAll(async () => {
    // MongoDB Memory Server başlat
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        MongooseModule.forRoot(mongoUri),
        // Winston logger'ı test için basit bir şekilde yapılandır
        WinstonModule.forRoot({
          transports: [
            new winston.transports.Console({
              format: winston.format.simple(),
            }),
          ],
        }),
        TransactionsModule,
        AgentsModule,
        CommissionsModule,
        CommonModule,
      ],
    }).compile();

    connection = module.get<Connection>(getConnectionToken());
    transactionsService = module.get<TransactionsService>(TransactionsService);
    agentsService = module.get<AgentsService>(AgentsService);
    commissionsService = module.get<CommissionsService>(CommissionsService);
    transactionModel = module.get<Model<TransactionDocument>>(
      getModelToken(Transaction.name),
    );
    agentModel = module.get<Model<AgentDocument>>(getModelToken(Agent.name));

    // Test agent'ları oluştur
    const listingAgent = await agentsService.create({
      name: 'Listing Agent',
      email: 'listing@test.com',
      phone: '05551111111',
    });

    const sellingAgent = await agentsService.create({
      name: 'Selling Agent',
      email: 'selling@test.com',
      phone: '05552222222',
    });

    listingAgentId = listingAgent._id.toString();
    sellingAgentId = sellingAgent._id.toString();
  });

  afterAll(async () => {
    if (connection) {
      await connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    // Her test öncesi transaction'ları temizle
    await transactionModel.deleteMany({});
  });

  describe('Transaction Creation with Agent Validation', () => {
    it('should create transaction when agents exist', async () => {
      // Arrange
      const createTransactionDto: CreateTransactionDto = {
        propertyId: 'prop-123',
        propertyType: PropertyTypeEnum.SALE,
        totalServiceFee: 10000,
        listingAgentId,
        sellingAgentId,
      };

      // Act
      const transaction = await transactionsService.create(createTransactionDto);

      // Assert
      expect(transaction).toBeDefined();
      expect(transaction.propertyId).toBe('prop-123');
      expect(transaction.currentStage).toBe(CurrentStageEnum.AGREEMENT);
      expect(transaction.stageHistory).toHaveLength(1);
      expect(transaction.stageHistory[0].stage).toBe(CurrentStageEnum.AGREEMENT);
    });

    it('should throw NotFoundException when listing agent does not exist', async () => {
      // Arrange
      const createTransactionDto: CreateTransactionDto = {
        propertyId: 'prop-123',
        propertyType: PropertyTypeEnum.SALE,
        totalServiceFee: 10000,
        listingAgentId: '507f1f77bcf86cd799439011', // Geçersiz ID
        sellingAgentId,
      };

      // Act & Assert
      await expect(
        transactionsService.create(createTransactionDto),
      ).rejects.toThrow();
    });
  });

  describe('Stage Update with Commission Calculation', () => {
    it('should update stage and calculate commission when completed', async () => {
      // Arrange
      const createTransactionDto: CreateTransactionDto = {
        propertyId: 'prop-123',
        propertyType: PropertyTypeEnum.SALE,
        totalServiceFee: 10000,
        listingAgentId,
        sellingAgentId,
      };

      const transaction = await transactionsService.create(createTransactionDto);

      // Act - Stage'leri sırayla güncelle
      const updateStage1: UpdateTransactionStageDto = {
        stage: CurrentStageEnum.EARNEST_MONEY,
        notes: 'Kapora ödendi',
      };
      await transactionsService.updateStage(
        transaction._id.toString(),
        updateStage1,
      );

      const updateStage2: UpdateTransactionStageDto = {
        stage: CurrentStageEnum.TITLE_DEED,
        notes: 'Tapu işlemleri tamamlandı',
      };
      await transactionsService.updateStage(
        transaction._id.toString(),
        updateStage2,
      );

      const updateStage3: UpdateTransactionStageDto = {
        stage: CurrentStageEnum.COMPLETED,
        notes: 'İşlem tamamlandı',
      };
      const completedTransaction = await transactionsService.updateStage(
        transaction._id.toString(),
        updateStage3,
      );

      // Assert
      expect(completedTransaction.currentStage).toBe(CurrentStageEnum.COMPLETED);
      expect(completedTransaction.commissionBreakdown).toBeDefined();
      expect(completedTransaction.commissionBreakdown.agencyAmount).toBe(5000);
      expect(completedTransaction.commissionBreakdown.agents).toHaveLength(2);
      expect(completedTransaction.stageHistory).toHaveLength(4); // Initial + 3 updates
    });

    it('should not calculate commission when stage is not completed', async () => {
      // Arrange
      const createTransactionDto: CreateTransactionDto = {
        propertyId: 'prop-123',
        propertyType: PropertyTypeEnum.SALE,
        totalServiceFee: 10000,
        listingAgentId,
        sellingAgentId,
      };

      const transaction = await transactionsService.create(createTransactionDto);

      // Act
      const updateStage: UpdateTransactionStageDto = {
        stage: CurrentStageEnum.EARNEST_MONEY,
        notes: 'Kapora ödendi',
      };
      const updatedTransaction = await transactionsService.updateStage(
        transaction._id.toString(),
        updateStage,
      );

      // Assert
      expect(updatedTransaction.currentStage).toBe(CurrentStageEnum.EARNEST_MONEY);
      expect(updatedTransaction.commissionBreakdown).toBeUndefined();
    });
  });

  describe('Commission Calculation Integration', () => {
    it('should calculate commission correctly for same agent', async () => {
      // Arrange - Aynı acente için transaction oluştur
      const createTransactionDto: CreateTransactionDto = {
        propertyId: 'prop-123',
        propertyType: PropertyTypeEnum.SALE,
        totalServiceFee: 10000,
        listingAgentId,
        sellingAgentId: listingAgentId, // Aynı acente
      };

      const transaction = await transactionsService.create(createTransactionDto);

      // Act - Stage'leri sırayla güncelle
      await transactionsService.updateStage(transaction._id.toString(), {
        stage: CurrentStageEnum.EARNEST_MONEY,
        notes: 'Kapora ödendi',
      });

      await transactionsService.updateStage(transaction._id.toString(), {
        stage: CurrentStageEnum.TITLE_DEED,
        notes: 'Tapu işlemleri tamamlandı',
      });

      const updateStage: UpdateTransactionStageDto = {
        stage: CurrentStageEnum.COMPLETED,
        notes: 'İşlem tamamlandı',
      };
      const completedTransaction = await transactionsService.updateStage(
        transaction._id.toString(),
        updateStage,
      );

      // Assert
      expect(completedTransaction.commissionBreakdown.agencyAmount).toBe(5000);
      expect(completedTransaction.commissionBreakdown.agents).toHaveLength(1);
      expect(completedTransaction.commissionBreakdown.agents[0].amount).toBe(5000);
      expect(completedTransaction.commissionBreakdown.agents[0].percentage).toBe(50);
    });

    it('should calculate commission correctly for different agents', async () => {
      // Arrange
      const createTransactionDto: CreateTransactionDto = {
        propertyId: 'prop-123',
        propertyType: PropertyTypeEnum.SALE,
        totalServiceFee: 10000,
        listingAgentId,
        sellingAgentId,
      };

      const transaction = await transactionsService.create(createTransactionDto);

      // Act - Stage'leri sırayla güncelle
      await transactionsService.updateStage(transaction._id.toString(), {
        stage: CurrentStageEnum.EARNEST_MONEY,
        notes: 'Kapora ödendi',
      });

      await transactionsService.updateStage(transaction._id.toString(), {
        stage: CurrentStageEnum.TITLE_DEED,
        notes: 'Tapu işlemleri tamamlandı',
      });

      const updateStage: UpdateTransactionStageDto = {
        stage: CurrentStageEnum.COMPLETED,
        notes: 'İşlem tamamlandı',
      };
      const completedTransaction = await transactionsService.updateStage(
        transaction._id.toString(),
        updateStage,
      );

      // Assert
      expect(completedTransaction.commissionBreakdown.agencyAmount).toBe(5000);
      expect(completedTransaction.commissionBreakdown.agents).toHaveLength(2);
      expect(completedTransaction.commissionBreakdown.agents[0].amount).toBe(2500);
      expect(completedTransaction.commissionBreakdown.agents[1].amount).toBe(2500);
    });
  });
});

