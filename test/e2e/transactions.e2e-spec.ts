import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { PropertyTypeEnum } from '../../src/transactions/enums/property-type.enum';
import { CurrentStageEnum } from '../../src/transactions/enums/current-stage.enum';

describe('Transactions E2E Tests', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let mongoServer: MongoMemoryServer;
  let listingAgentId: string;
  let sellingAgentId: string;

  beforeAll(async () => {
    // MongoDB Memory Server başlat
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    moduleFixture = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Global Validation Pipe (main.ts'deki gibi)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Global Exception Filter
    app.useGlobalFilters(new HttpExceptionFilter());

    // Global Response Interceptor
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();

    // AuditInterceptor E2E testlerinde opsiyonel - şimdilik atlıyoruz
    // Gerçek uygulamada main.ts'de zaten aktif

    // Test agent'ları oluştur
    const listingAgentResponse = await request(app.getHttpServer())
      .post('/agents')
      .send({
        name: 'Listing Agent',
        email: 'listing@test.com',
        phone: '05551111111',
      })
      .expect(201);

    const sellingAgentResponse = await request(app.getHttpServer())
      .post('/agents')
      .send({
        name: 'Selling Agent',
        email: 'selling@test.com',
        phone: '05552222222',
      })
      .expect(201);

    // Response kontrolü - TransformInterceptor data wrapper ekliyor
    const listingAgent = listingAgentResponse.body.data || listingAgentResponse.body;
    const sellingAgent = sellingAgentResponse.body.data || sellingAgentResponse.body;

    if (!listingAgent || !sellingAgent || !listingAgent._id || !sellingAgent._id) {
      throw new Error(
        `Agent creation failed. Listing: ${JSON.stringify(listingAgentResponse.body)}, Selling: ${JSON.stringify(sellingAgentResponse.body)}`,
      );
    }

    listingAgentId = listingAgent._id;
    sellingAgentId = sellingAgent._id;
  });

  afterAll(async () => {
    if (mongoServer) {
      await mongoServer.stop();
    }
    await app.close();
  });

  describe('POST /transactions', () => {
    it('should create a transaction successfully', () => {
      return request(app.getHttpServer())
        .post('/transactions')
        .send({
          propertyId: 'prop-123',
          propertyType: PropertyTypeEnum.SALE,
          totalServiceFee: 10000,
          listingAgentId,
          sellingAgentId,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('_id');
          expect(res.body.data.propertyId).toBe('prop-123');
          expect(res.body.data.currentStage).toBe(CurrentStageEnum.AGREEMENT);
          expect(res.body.data.stageHistory).toHaveLength(1);
        });
    });

    it('should return 404 when agent not found', () => {
      return request(app.getHttpServer())
        .post('/transactions')
        .send({
          propertyId: 'prop-123',
          propertyType: PropertyTypeEnum.SALE,
          totalServiceFee: 10000,
          listingAgentId: '507f1f77bcf86cd799439011', // Geçersiz ID
          sellingAgentId,
        })
        .expect(404);
    });

    it('should return 400 when validation fails', () => {
      return request(app.getHttpServer())
        .post('/transactions')
        .send({
          propertyId: '', // Geçersiz
          propertyType: PropertyTypeEnum.SALE,
          totalServiceFee: -1000, // Geçersiz
          listingAgentId,
          sellingAgentId,
        })
        .expect(400);
    });
  });

  describe('GET /transactions', () => {
    it('should return list of transactions', async () => {
      // Önce bir transaction oluştur
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          propertyId: 'prop-123',
          propertyType: PropertyTypeEnum.SALE,
          totalServiceFee: 10000,
          listingAgentId,
          sellingAgentId,
        });

      return request(app.getHttpServer())
        .get('/transactions')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter transactions by stage', async () => {
      return request(app.getHttpServer())
        .get('/transactions')
        .query({ stage: CurrentStageEnum.AGREEMENT })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          if (res.body.data.length > 0) {
            res.body.data.forEach((transaction: any) => {
              expect(transaction.currentStage).toBe(CurrentStageEnum.AGREEMENT);
            });
          }
        });
    });
  });

  describe('PATCH /transactions/:id/stage', () => {
    let transactionId: string;

    beforeEach(async () => {
      // Her test öncesi yeni bir transaction oluştur
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .send({
          propertyId: 'prop-123',
          propertyType: PropertyTypeEnum.SALE,
          totalServiceFee: 10000,
          listingAgentId,
          sellingAgentId,
        });

      transactionId = response.body.data._id;
    });

    it('should update stage successfully', () => {
      return request(app.getHttpServer())
        .patch(`/transactions/${transactionId}/stage`)
        .send({
          stage: CurrentStageEnum.EARNEST_MONEY,
          notes: 'Kapora ödendi',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.currentStage).toBe(CurrentStageEnum.EARNEST_MONEY);
          expect(res.body.data.stageHistory.length).toBeGreaterThan(1);
        });
    });

    it('should calculate commission when stage is COMPLETED', async () => {
      // Önce stage'leri sırayla güncelle
      await request(app.getHttpServer())
        .patch(`/transactions/${transactionId}/stage`)
        .send({
          stage: CurrentStageEnum.EARNEST_MONEY,
          notes: 'Kapora ödendi',
        });

      await request(app.getHttpServer())
        .patch(`/transactions/${transactionId}/stage`)
        .send({
          stage: CurrentStageEnum.TITLE_DEED,
          notes: 'Tapu işlemleri tamamlandı',
        });

      return request(app.getHttpServer())
        .patch(`/transactions/${transactionId}/stage`)
        .send({
          stage: CurrentStageEnum.COMPLETED,
          notes: 'İşlem tamamlandı',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.currentStage).toBe(CurrentStageEnum.COMPLETED);
          expect(res.body.data.commissionBreakdown).toBeDefined();
          expect(res.body.data.commissionBreakdown.agencyAmount).toBe(5000);
        });
    });

    it('should return 400 for invalid stage transition', () => {
      return request(app.getHttpServer())
        .patch(`/transactions/${transactionId}/stage`)
        .send({
          stage: CurrentStageEnum.COMPLETED, // AGREEMENT'dan direkt COMPLETED'e geçiş
          notes: 'Invalid transition',
        })
        .expect(400);
    });

    it('should return 404 when transaction not found', () => {
      return request(app.getHttpServer())
        .patch('/transactions/507f1f77bcf86cd799439011/stage')
        .send({
          stage: CurrentStageEnum.EARNEST_MONEY,
          notes: 'Test',
        })
        .expect(404);
    });
  });

  describe('GET /transactions/:id/commission', () => {
    let transactionId: string;

    beforeEach(async () => {
      // Transaction oluştur ve COMPLETED yap
      const createResponse = await request(app.getHttpServer())
        .post('/transactions')
        .send({
          propertyId: 'prop-123',
          propertyType: PropertyTypeEnum.SALE,
          totalServiceFee: 10000,
          listingAgentId,
          sellingAgentId,
        });

      transactionId = (createResponse.body.data || createResponse.body)._id;

      // Stage'leri güncelle
      await request(app.getHttpServer())
        .patch(`/transactions/${transactionId}/stage`)
        .send({ stage: CurrentStageEnum.EARNEST_MONEY });

      await request(app.getHttpServer())
        .patch(`/transactions/${transactionId}/stage`)
        .send({ stage: CurrentStageEnum.TITLE_DEED });

      await request(app.getHttpServer())
        .patch(`/transactions/${transactionId}/stage`)
        .send({ stage: CurrentStageEnum.COMPLETED });
    });

    it('should return commission breakdown for completed transaction', () => {
      return request(app.getHttpServer())
        .get(`/transactions/${transactionId}/commission`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('agencyAmount');
          expect(res.body.data).toHaveProperty('agents');
          expect(res.body.data.agencyAmount).toBe(5000);
        });
    });

    it('should return 400 when transaction is not completed', async () => {
      // Yeni bir transaction oluştur (COMPLETED değil)
      const createResponse = await request(app.getHttpServer())
        .post('/transactions')
        .send({
          propertyId: 'prop-456',
          propertyType: PropertyTypeEnum.SALE,
          totalServiceFee: 10000,
          listingAgentId,
          sellingAgentId,
        });

      const newTransactionId = (createResponse.body.data || createResponse.body)._id;

      return request(app.getHttpServer())
        .get(`/transactions/${newTransactionId}/commission`)
        .expect(400);
    });
  });
});

