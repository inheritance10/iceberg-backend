import { Module } from '@nestjs/common';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { AgentsModule } from '../agents/agents.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    AgentsModule,
    TransactionsModule, // TransactionsService bu modülden export edilmeli
  ],
  controllers: [SimulationController],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class SimulationModule {}

