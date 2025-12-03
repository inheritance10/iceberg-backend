import { Module } from '@nestjs/common';
import { ValidationService } from './services/validation.service';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [AgentsModule],
  providers: [ValidationService],
  exports: [ValidationService], // Diğer modüller kullanabilsin
})
export class CommonModule {}

