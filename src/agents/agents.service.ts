import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Agent, AgentDocument } from './entities/agent.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
  ) {}

  /**
   * Yeni bir acente oluşturur
   * @param createAgentDto - Acente bilgileri
   * @returns Oluşturulan acente
   * @throws ConflictException - Email zaten kullanılıyorsa
   */
  async create(createAgentDto: CreateAgentDto): Promise<Agent> {
    try {
      const createdAgent = new this.agentModel(createAgentDto);
      return await createdAgent.save();
    } catch (error) {
      // MongoDB unique index hatası (email duplicate)
      if (error.code === 11000) {
        throw new ConflictException(
          `Agent with email ${createAgentDto.email} already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Tüm acenteleri getirir (silinmemiş olanlar - plugin ile otomatik filtre uyguluyoruz.Burası bir middleware gibi düşünülebilir.)
   * @returns Acente listesi
   */
  async findAll(): Promise<Agent[]> {
    return this.agentModel.find().exec();
  }

  /**
   * ID'ye göre acente bulur (silinmemiş olanlar - plugin otomatik filtreler.Burası bir middleware gibi düşünülebilir.)
   * @param id - Acente ID'si
   * @returns Bulunan acente
   * @throws NotFoundException - Acente bulunamazsa
   */
  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentModel.findById(id).exec();
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
    return agent;
  }

  /**
   * Acente bilgilerini günceller
   * @param id - Acente ID'si
   * @param updateAgentDto - Güncellenecek bilgiler
   * @returns Güncellenmiş acente
   * @throws NotFoundException - Acente bulunamazsa
   * @throws ConflictException - Email zaten kullanılıyorsa
   */
  async update(id: string, updateAgentDto: UpdateAgentDto): Promise<Agent> {
    try {
      const updatedAgent = await this.agentModel
        .findByIdAndUpdate(id, updateAgentDto, { new: true, runValidators: true })
        .exec();

      if (!updatedAgent) {
        throw new NotFoundException(`Agent with ID ${id} not found`);
      }

      return updatedAgent;
    } catch (error) {
      // MongoDB unique index hatası (email duplicate)
      if (error.code === 11000) {
        throw new ConflictException(
          `Agent with email ${updateAgentDto.email} already exists`,
        );
      }
      // NotFoundException'ı tekrar fırlat
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Acenteyi soft delete yapar (fiziksel olarak silmez)
   * @param id - Acente ID'si
   * @throws NotFoundException - Acente bulunamazsa
   */
  async remove(id: string): Promise<void> {
    const agent = await this.findOne(id); // Önce kontrol et

    await this.agentModel.findByIdAndUpdate(id, {
      deletedAt: new Date(),
      deleted: true,
    });
  }
}
