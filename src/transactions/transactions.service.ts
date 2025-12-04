import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { UpdateTransactionStageDto } from './dto/update-transaction-stage.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { CommissionsService } from '../commissions/commissions.service';
import { ValidationService } from '../common/services/validation.service';
import { StageValidationService } from './services/stage-validation.service';
import { CurrentStageEnum } from './enums/current-stage.enum';
import { StageHistory } from './entities/stage-history.entity';
import { ICommissionBreakdown } from '../commissions/interfaces/commission-breakdown.interface';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    private readonly commissionsService: CommissionsService,
    private readonly validationService: ValidationService,
    private readonly stageValidationService: StageValidationService,
  ) {}

  /**
   * Yeni bir transaction oluşturur
   * @param createTransactionDto - Transaction bilgileri
   * @returns Oluşturulan transaction
   * @throws NotFoundException - Agent bulunamazsa
   */
  async create(
    createTransactionDto: CreateTransactionDto,
  ): Promise<Transaction> {
    // String'den ObjectId'ye çevir
    const listingAgentId = new Types.ObjectId(createTransactionDto.listingAgentId);
    const sellingAgentId = new Types.ObjectId(createTransactionDto.sellingAgentId);

    // Agent'ların var olduğunu kontrol et
    await this.validationService.validateAgents(
      listingAgentId.toString(),
      sellingAgentId.toString(),
    );

    // İlk stage history kaydını oluştur
    const initialStageHistory: StageHistory = {
      stage: CurrentStageEnum.AGREEMENT,
      timestamp: new Date(),
      notes: 'Transaction created',
    };

    const transaction = new this.transactionModel({
      ...createTransactionDto,
      listingAgentId,
      sellingAgentId,
      currentStage: CurrentStageEnum.AGREEMENT,
      stageHistory: [initialStageHistory],
    });

    return transaction.save();
  }

  /**
   * Tüm transaction'ları getirir (filtreleme ve sayfalama ile)
   * Silinmemiş olanları getirir (plugin otomatik filtreler.Burası bir middleware gibi düşünülebilir.)
   * @param queryDto - Filtreleme ve sayfalama parametreleri
   * @returns Transaction listesi
   */
  async findAll(queryDto?: TransactionQueryDto): Promise<Transaction[]> {
    const query = this.buildQuery(queryDto);
    const page = queryDto?.page || 1;
    const limit = queryDto?.limit || 10;
    const skip = (page - 1) * limit;

    return this.transactionModel
      .find(query)
      .populate('listingAgentId', 'name email')
      .populate('sellingAgentId', 'name email')
      .skip(skip)
      .limit(limit)
      .exec();
  }

  /**
   * ID'ye göre transaction bulur (silinmemiş olanlar - plugin otomatik filtreler.Burası bir middleware gibi düşünülebilir.)
   * @param id - Transaction ID'si
   * @returns Bulunan transaction
   * @throws NotFoundException - Transaction bulunamazsa
   */
  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.transactionModel
      .findById(id)
      .populate('listingAgentId', 'name email')
      .populate('sellingAgentId', 'name email')
      .exec();

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  /**
   * Transaction bilgilerini günceller (stage hariç)
   * @param id - Transaction ID'si
   * @param updateTransactionDto - Güncellenecek bilgiler
   * @returns Güncellenmiş transaction
   * @throws NotFoundException - Transaction bulunamazsa
   */
  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
  ): Promise<Transaction> {
    // Mevcut transaction'ı al (agent ID'leri için)
    const existingTransaction = await this.findOne(id);
    
    // Update DTO'yu hazırla
    const updateData: Record<string, any> = { ...updateTransactionDto };

    // Eğer agent ID'leri güncelleniyorsa, ObjectId'ye çevir ve validation yap
    let listingAgentId: Types.ObjectId | undefined;
    let sellingAgentId: Types.ObjectId | undefined;

    if (updateTransactionDto.listingAgentId) {
      listingAgentId = new Types.ObjectId(
        updateTransactionDto.listingAgentId as any,
      );
      updateData.listingAgentId = listingAgentId;
    }

    if (updateTransactionDto.sellingAgentId) {
      sellingAgentId = new Types.ObjectId(
        updateTransactionDto.sellingAgentId as any,
      );
      updateData.sellingAgentId = sellingAgentId;
    }

    // Eğer agent ID'leri güncelleniyorsa, validation yap
    if (listingAgentId || sellingAgentId) {
      await this.validationService.validateAgents(
        listingAgentId?.toString() || existingTransaction.listingAgentId.toString(),
        sellingAgentId?.toString() || existingTransaction.sellingAgentId.toString(),
      );
    }

    const updatedTransaction = await this.transactionModel
      .findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      })
      .populate('listingAgentId', 'name email')
      .populate('sellingAgentId', 'name email')
      .exec();

    if (!updatedTransaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return updatedTransaction;
  }

  /**
   * Transaction stage'ini günceller
   * @param id - Transaction ID'si
   * @param updateStageDto - Yeni stage bilgileri
   * @returns Güncellenmiş transaction
   * @throws NotFoundException - Transaction bulunamazsa
   * @throws BadRequestException - Geçersiz stage geçişi
   */
  async updateStage(
    id: string,
    updateStageDto: UpdateTransactionStageDto,
  ): Promise<Transaction> {
    const transaction = await this.findOne(id);

    // Stage geçişini validate et
    this.stageValidationService.validateTransition(
      transaction.currentStage,
      updateStageDto.stage,
    );

    // Yeni stage history kaydı oluştur
    const newStageHistory: StageHistory = {
      stage: updateStageDto.stage,
      timestamp: new Date(),
      notes: updateStageDto.notes,
    };

    // Stage history'ye ekliyoruz.
    const updatedStageHistory = [...transaction.stageHistory, newStageHistory];

    // Eğer completed olduysa, komisyon hesaplanıyor.
    let commissionBreakdown = transaction.commissionBreakdown;
    if (this.stageValidationService.isCompleted(updateStageDto.stage)) {
      commissionBreakdown = this.commissionsService.calculateCommission(
        transaction,
      ) as any; // Mongoose schema'ya uygun hale getiriyoruz.
    }

    // Transaction'ı güncelliyoruz.
    const updatedTransaction = await this.transactionModel
      .findByIdAndUpdate(
        id,
        {
          currentStage: updateStageDto.stage,
          stageHistory: updatedStageHistory,
          ...(commissionBreakdown && { commissionBreakdown }),
        },
        { new: true, runValidators: true },
      )
      .populate('listingAgentId', 'name email')
      .populate('sellingAgentId', 'name email')
      .exec();

    return updatedTransaction!;
  }

  /**
   * Transaction'ın komisyon dökümünü getirir
   * @param id - Transaction ID'si
   * @returns Komisyon dökümü
   * @throws NotFoundException - Transaction bulunamazsa
   * @throws BadRequestException - Transaction henüz completed değilse
   */
  async getCommissionBreakdown(id: string): Promise<ICommissionBreakdown> {
    const transaction = await this.findOne(id);

    // Eğer completed değilse, hata fırlat
    if (this.stageValidationService.isNotCompleted(transaction.currentStage)) {
      throw new BadRequestException(
        `Transaction is not completed yet. Current stage: ${transaction.currentStage}`,
      );
    }

    // Eğer commissionBreakdown yoksa, hesaplanıyor ve kaydediliyor.
    if (!transaction.commissionBreakdown) {
      const breakdown = this.commissionsService.calculateCommission(transaction);
      
      await this.transactionModel.findByIdAndUpdate(id, {
        commissionBreakdown: breakdown as any,
      });

      return breakdown;
    }

    // Mevcut commissionBreakdown'ı interface formatına çeviriyoruz.
    return {
      agencyAmount: transaction.commissionBreakdown.agencyAmount,
      agents: transaction.commissionBreakdown.agents.map((agent) => ({
        agentId: agent.agentId,
        amount: agent.amount,
        role: agent.role,
        percentage: agent.percentage,
      })),
      calculatedAt: transaction.commissionBreakdown.calculatedAt,
    };
  }

  /**
   * Transaction'ı soft delete yapar (fiziksel olarak silmez)
   * @param id - Transaction ID'si
   * @throws NotFoundException - Transaction bulunamazsa
   */
  async remove(id: string): Promise<void> {
    const transaction = await this.findOne(id); // Önce kontrol ediyoruz.

    await this.transactionModel.findByIdAndUpdate(id, {
      deletedAt: new Date(),
      deleted: true,
    });
  }


  /**
   * Query parametrelerine göre MongoDB query oluşturur
   * @param queryDto - Query parametreleri
   * @returns MongoDB query objesi
   */
  private buildQuery(queryDto?: TransactionQueryDto): Record<string, any> {
    const query: Record<string, any> = {};

    if (queryDto?.stage) {
      query.currentStage = queryDto.stage;
    }

    if (queryDto?.propertyType) {
      query.propertyType = queryDto.propertyType;
    }

    return query;
  }
}
