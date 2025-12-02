import { Module } from '@nestjs/common';
import { CommissionsService } from './commissions.service';

@Module({
  providers: [CommissionsService]
})
export class CommissionsModule {}
