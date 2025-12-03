import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ValidationService } from './services/validation.service';
import { AuditService } from './services/audit.service';
import { AgentsModule } from '../agents/agents.module';
import { AuditLog, AuditLogSchema } from './entities/audit-log.entity';

@Module({
  imports: [
    AgentsModule,
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  providers: [ValidationService, AuditService],
  exports: [ValidationService, AuditService], // Diğer modüller kullanabilsin
})
export class CommonModule {}

