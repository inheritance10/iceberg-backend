import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuditService } from './common/services/audit.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO'da tanımlı olmayan property'leri reddetmeyi sağlıyoruz.Bunun amacı güvenlik için.
      forbidNonWhitelisted: true, // DTO'da olmayan property varsa hata fırlatıyoruz.
      transform: true, // DTO'ları otomatik transform etmeyi sağlıyoruz.Bunun amacı dto'dan gelen verileri otomatik olarak transform etmeyi sağlıyoruz.
      transformOptions: {
        enableImplicitConversion: true, // String'leri number'a otomatik çeviriyoruz.
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Response Interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global Audit Interceptor
  const reflector = app.get(Reflector);
  const auditService = app.get(AuditService);
  app.useGlobalInterceptors(new AuditInterceptor(auditService, reflector));

  // CORS
  app.enableCors();

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Iceberg Backend API')
    .setDescription(
      'Emlak danışmanlık şirketi için işlem takip ve komisyon dağıtım sistemi API dokümantasyonu',
    )
    .setVersion('1.0')
    .addTag('agents', 'Acente yönetimi endpoint\'leri')
    .addTag('transactions', 'İşlem yönetimi endpoint\'leri')
    .addTag('health', 'Sistem sağlık kontrolü')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();
