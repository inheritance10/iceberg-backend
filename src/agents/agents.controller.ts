import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { AuditAction, AuditEntityType } from '../common/entities/audit-log.entity';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  /**
   * Yeni bir acente oluşturuyoruz.
   * POST /agents
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AuditLog({ action: AuditAction.CREATE, entityType: AuditEntityType.AGENT })
  @ApiOperation({ summary: 'Yeni bir acente oluşturur' })
  @ApiResponse({
    status: 201,
    description: 'Acente başarıyla oluşturuldu',
  })
  @ApiResponse({
    status: 409,
    description: 'Email zaten kullanılıyor',
  })
  @ApiBody({ type: CreateAgentDto })
  async create(@Body() createAgentDto: CreateAgentDto) {
    return this.agentsService.create(createAgentDto);
  }

  /**
   * Tüm acenteleri listeliyoruz.
   * GET /agents
   */
  @Get()
  @ApiOperation({ summary: 'Tüm acenteleri listeler' })
  @ApiResponse({
    status: 200,
    description: 'Acente listesi başarıyla getirildi',
  })
  async findAll() {
    return this.agentsService.findAll();
  }

  /**
   * ID'ye göre acente detayını getiriyoruz.
   * GET /agents/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'ID ye gore acente detayini getirir' })
  @ApiParam({ name: 'id', description: 'Acente ID' })
  @ApiResponse({
    status: 200,
    description: 'Acente detayı başarıyla getirildi',
  })
  @ApiResponse({
    status: 404,
    description: 'Acente bulunamadı',
  })
  async findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  /**
   * Acente bilgilerini güncelliyoruz.
   * PATCH /agents/:id
   */
  @Patch(':id')
  @AuditLog({ action: AuditAction.UPDATE, entityType: AuditEntityType.AGENT })
  @ApiOperation({ summary: 'Acente bilgilerini günceller' })
  @ApiParam({ name: 'id', description: 'Acente ID' })
  @ApiResponse({
    status: 200,
    description: 'Acente başarıyla güncellendi',
  })
  @ApiResponse({
    status: 404,
    description: 'Acente bulunamadı',
  })
  @ApiResponse({
    status: 409,
    description: 'Email zaten kullanılıyor',
  })
  @ApiBody({ type: UpdateAgentDto })
  async update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
  ) {
    return this.agentsService.update(id, updateAgentDto);
  }

  /**
   * Acenteyi siliyoruz.
   * DELETE /agents/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ action: AuditAction.SOFT_DELETE, entityType: AuditEntityType.AGENT })
  @ApiOperation({ summary: 'Acenteyi siler' })
  @ApiParam({ name: 'id', description: 'Acente ID' })
  @ApiResponse({
    status: 204,
    description: 'Acente başarıyla silindi',
  })
  @ApiResponse({
    status: 404,
    description: 'Acente bulunamadı',
  })
  async remove(@Param('id') id: string) {
    await this.agentsService.remove(id);
  }
}
