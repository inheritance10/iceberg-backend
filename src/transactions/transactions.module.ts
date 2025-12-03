import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionSchema } from './entities/transaction.entity';
import { CommissionsModule } from '../commissions/commissions.module';
import { CommonModule } from '../common/common.module';
import { StageValidationService } from './services/stage-validation.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    CommissionsModule, // CommissionsService'i kullanmak için import ediyoruz.Bunun amacı komisyon hesaplamasını yapmak için.
    CommonModule, // ValidationService'i kullanmak için import ediyoruz.Bunun amacı agent validation yapmak için.
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, StageValidationService],
  exports: [TransactionsService], // SimulationModule'de kullanmak için export et
})
export class TransactionsModule {}
