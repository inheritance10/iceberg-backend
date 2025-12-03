import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AgentsModule } from './agents/agents.module';
import { CommissionsModule } from './commissions/commissions.module';
import { CommonModule } from './common/common.module';
import { SimulationModule } from './simulation/simulation.module';
import { winstonConfig } from './common/logger/winston.config';

@Module({
  imports: [
    AppConfigModule,
    winstonConfig, // Winston logger'ı global olarak ekle
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),
    CommonModule, // ValidationService ve AuditService için
    TransactionsModule,
    AgentsModule,
    CommissionsModule,
    SimulationModule, // Simülasyon modülü
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
