import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { UpdateTransactionStageDto } from './dto/update-transaction-stage.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Yeni bir işlem oluşturur
   * POST /transactions
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Yeni bir işlem oluşturur' })
  @ApiResponse({
    status: 201,
    description: 'İşlem başarıyla oluşturuldu',
  })
  @ApiResponse({
    status: 404,
    description: 'Agent bulunamadı',
  })
  @ApiBody({ type: CreateTransactionDto })
  async create(@Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionsService.create(createTransactionDto);
  }

  /**
   * Tüm işlemleri listeler (filtreleme ve sayfalama ile)
   * GET /transactions?stage=AGREEMENT&propertyType=sale&page=1&limit=10
   */
  @Get()
  @ApiOperation({
    summary: 'Tüm işlemleri listeler',
    description: 'Filtreleme ve sayfalama parametreleri ile işlemleri getirir',
  })
  @ApiQuery({ name: 'stage', required: false, enum: ['AGREEMENT', 'EARNEST_MONEY', 'TITLE_DEED', 'COMPLETED'] as any })
  @ApiQuery({ name: 'propertyType', required: false, enum: ['sale', 'rental'] as any })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'İşlem listesi başarıyla getirildi',
  })
  async findAll(@Query() queryDto: TransactionQueryDto) {
    return this.transactionsService.findAll(queryDto);
  }

  /**
   * ID'ye göre işlem detayını getirir
   * GET /transactions/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'ID ye gore islem detayini getirir' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'İşlem detayı başarıyla getirildi',
  })
  @ApiResponse({
    status: 404,
    description: 'İşlem bulunamadı',
  })
  async findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  /**
   * İşlem bilgilerini günceller (stage hariç)
   * PATCH /transactions/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: 'İşlem bilgilerini günceller (stage hariç)' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'İşlem başarıyla güncellendi',
  })
  @ApiResponse({
    status: 404,
    description: 'İşlem veya agent bulunamadı',
  })
  @ApiBody({ type: UpdateTransactionDto })
  async update(
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, updateTransactionDto);
  }

  /**
   * İşlem aşamasını günceller
   * PATCH /transactions/:id/stage
   */
  @Patch(':id/stage')
  @ApiOperation({
    summary: 'İşlem aşamasını günceller',
    description: 'İşlemin stage\'ini günceller. Completed olduğunda komisyon otomatik hesaplanır.',
  })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'İşlem aşaması başarıyla güncellendi',
  })
  @ApiResponse({
    status: 400,
    description: 'Geçersiz stage geçişi',
  })
  @ApiResponse({
    status: 404,
    description: 'İşlem bulunamadı',
  })
  @ApiBody({ type: UpdateTransactionStageDto })
  async updateStage(
    @Param('id') id: string,
    @Body() updateStageDto: UpdateTransactionStageDto,
  ) {
    return this.transactionsService.updateStage(id, updateStageDto);
  }

  /**
   * İşlemin komisyon dökümünü getirir
   * GET /transactions/:id/commission
   */
  @Get(':id/commission')
  @ApiOperation({
    summary: 'İşlemin komisyon dökümünü getirir',
    description: 'Sadece completed olan işlemler için komisyon dökümü döner',
  })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Komisyon dökümü başarıyla getirildi',
  })
  @ApiResponse({
    status: 400,
    description: 'İşlem henüz completed değil',
  })
  @ApiResponse({
    status: 404,
    description: 'İşlem bulunamadı',
  })
  async getCommissionBreakdown(@Param('id') id: string) {
    return this.transactionsService.getCommissionBreakdown(id);
  }

  /**
   * İşlemi siler
   * DELETE /transactions/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'İşlemi siler' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 204,
    description: 'İşlem başarıyla silindi',
  })
  @ApiResponse({
    status: 404,
    description: 'İşlem bulunamadı',
  })
  async remove(@Param('id') id: string) {
    await this.transactionsService.remove(id);
  }
}
