import { Module } from '@nestjs/common';
import { CommissionsService } from './commissions.service';

@Module({
  providers: [CommissionsService],
  exports: [CommissionsService], // TransactionsModule'de kullanmak için export et
})
export class CommissionsModule {}
