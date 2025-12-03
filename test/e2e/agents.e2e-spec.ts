import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';

describe('Agents E2E Tests', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let mongoServer: MongoMemoryServer;

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
  });

  afterAll(async () => {
    if (mongoServer) {
      await mongoServer.stop();
    }
    await app.close();
  });

  describe('POST /agents', () => {
    it('should create an agent successfully', () => {
      return request(app.getHttpServer())
        .post('/agents')
        .send({
          name: 'Ahmet Yılmaz',
          email: 'ahmet@example.com',
          phone: '05551234567',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('_id');
          expect(res.body.data.name).toBe('Ahmet Yılmaz');
          expect(res.body.data.email).toBe('ahmet@example.com');
        });
    });

    it('should return 400 when validation fails', () => {
      return request(app.getHttpServer())
        .post('/agents')
        .send({
          name: '', // Geçersiz
          email: 'invalid-email', // Geçersiz
          phone: '123', // Geçersiz
        })
        .expect(400);
    });

    it('should return 409 when email already exists', async () => {
      // İlk agent'ı oluştur
      await request(app.getHttpServer())
        .post('/agents')
        .send({
          name: 'First Agent',
          email: 'duplicate@example.com',
          phone: '05551111111',
        });

      // Aynı email ile ikinci agent oluşturmayı dene
      return request(app.getHttpServer())
        .post('/agents')
        .send({
          name: 'Second Agent',
          email: 'duplicate@example.com',
          phone: '05552222222',
        })
        .expect(409);
    });
  });

  describe('GET /agents', () => {
    it('should return list of agents', async () => {
      // Önce bir agent oluştur
      await request(app.getHttpServer())
        .post('/agents')
        .send({
          name: 'Test Agent',
          email: 'test@example.com',
          phone: '05559999999',
        });

      return request(app.getHttpServer())
        .get('/agents')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('GET /agents/:id', () => {
    let agentId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/agents')
        .send({
          name: 'Test Agent',
          email: `test-${Date.now()}@example.com`,
          phone: '05559999999',
        });

      agentId = response.body.data._id;
    });

    it('should return agent by id', () => {
      return request(app.getHttpServer())
        .get(`/agents/${agentId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data._id).toBe(agentId);
        });
    });

    it('should return 404 when agent not found', () => {
      return request(app.getHttpServer())
        .get('/agents/507f1f77bcf86cd799439011')
        .expect(404);
    });
  });

  describe('PATCH /agents/:id', () => {
    let agentId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/agents')
        .send({
          name: 'Test Agent',
          email: `test-${Date.now()}@example.com`,
          phone: '05559999999',
        });

      agentId = response.body.data._id;
    });

    it('should update agent successfully', () => {
      return request(app.getHttpServer())
        .patch(`/agents/${agentId}`)
        .send({
          name: 'Updated Name',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe('Updated Name');
        });
    });

    it('should return 404 when agent not found', () => {
      return request(app.getHttpServer())
        .patch('/agents/507f1f77bcf86cd799439011')
        .send({
          name: 'Updated Name',
        })
        .expect(404);
    });
  });

  describe('DELETE /agents/:id', () => {
    let agentId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/agents')
        .send({
          name: 'Test Agent',
          email: `test-${Date.now()}@example.com`,
          phone: '05559999999',
        });

      agentId = response.body.data._id;
    });

    it('should soft delete agent successfully', () => {
      return request(app.getHttpServer())
        .delete(`/agents/${agentId}`)
        .expect(204);
    });

    it('should return 404 when agent not found', () => {
      return request(app.getHttpServer())
        .delete('/agents/507f1f77bcf86cd799439011')
        .expect(404);
    });

    it('should not return deleted agent in list', async () => {
      // Agent'ı sil
      await request(app.getHttpServer())
        .delete(`/agents/${agentId}`)
        .expect(204);

      // Liste sorgusu yap
      return request(app.getHttpServer())
        .get('/agents')
        .expect(200)
        .expect((res) => {
          const deletedAgent = res.body.data.find(
            (agent: any) => agent._id === agentId,
          );
          expect(deletedAgent).toBeUndefined();
        });
    });
  });
});

