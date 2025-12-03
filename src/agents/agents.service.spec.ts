import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { Agent, AgentDocument } from './entities/agent.entity';
import { Model } from 'mongoose';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

describe('AgentsService', () => {
  let service: AgentsService;
  let model: Model<AgentDocument>;

  const mockAgent = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Ahmet Yılmaz',
    email: 'ahmet@example.com',
    phone: '05551234567',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock Model - constructor ve static methods
  const mockAgentModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        {
          provide: getModelToken(Agent.name),
          useValue: mockAgentModel,
        },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
    model = module.get<Model<AgentDocument>>(getModelToken(Agent.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an agent successfully', async () => {
      // Arrange
      const createAgentDto: CreateAgentDto = {
        name: 'Ahmet Yılmaz',
        email: 'ahmet@example.com',
        phone: '05551234567',
      };

      const savedAgent = {
        ...mockAgent,
        ...createAgentDto,
        save: jest.fn().mockResolvedValue({ ...mockAgent, ...createAgentDto }),
      };

      // Mock constructor
      const MockModel = jest.fn().mockImplementation((dto) => savedAgent);
      (model as any).constructor = MockModel;
      (service as any).agentModel = MockModel;

      // Act
      const result = await service.create(createAgentDto);

      // Assert
      expect(MockModel).toHaveBeenCalledWith(createAgentDto);
      expect(savedAgent.save).toHaveBeenCalled();
      expect(result).toEqual({ ...mockAgent, ...createAgentDto });
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      const createAgentDto: CreateAgentDto = {
        name: 'Ahmet Yılmaz',
        email: 'ahmet@example.com',
        phone: '05551234567',
      };

      const error = new Error('Duplicate key');
      (error as any).code = 11000; // MongoDB duplicate key error code

      const savedAgent = {
        ...mockAgent,
        ...createAgentDto,
        save: jest.fn().mockRejectedValue(error),
      };

      const MockModel = jest.fn().mockImplementation((dto) => savedAgent);
      (model as any).constructor = MockModel;
      (service as any).agentModel = MockModel;

      // Act & Assert
      await expect(service.create(createAgentDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of agents', async () => {
      // Arrange
      const agents = [mockAgent];
      (model.find as jest.Mock) = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(agents),
      });

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(agents);
      expect(model.find).toHaveBeenCalled();
    });

    it('should return empty array when no agents exist', async () => {
      // Arrange
      (model.find as jest.Mock) = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return an agent by id', async () => {
      // Arrange
      const agentId = '507f1f77bcf86cd799439011';
      (model.findById as jest.Mock) = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAgent),
      });

      // Act
      const result = await service.findOne(agentId);

      // Assert
      expect(result).toEqual(mockAgent);
      expect(model.findById).toHaveBeenCalledWith(agentId);
    });

    it('should throw NotFoundException when agent not found', async () => {
      // Arrange
      const agentId = '507f1f77bcf86cd799439011';
      (model.findById as jest.Mock) = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(service.findOne(agentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an agent successfully', async () => {
      // Arrange
      const agentId = '507f1f77bcf86cd799439011';
      const updateAgentDto: UpdateAgentDto = {
        name: 'Ahmet Yılmaz Updated',
      };

      const updatedAgent = {
        ...mockAgent,
        name: 'Ahmet Yılmaz Updated',
      };

      (model.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedAgent),
      });

      // Act
      const result = await service.update(agentId, updateAgentDto);

      // Assert
      expect(result).toEqual(updatedAgent);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        agentId,
        updateAgentDto,
        { new: true, runValidators: true },
      );
    });

    it('should throw NotFoundException when agent not found', async () => {
      // Arrange
      const agentId = '507f1f77bcf86cd799439011';
      const updateAgentDto: UpdateAgentDto = {
        name: 'Ahmet Yılmaz Updated',
      };

      (model.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(service.update(agentId, updateAgentDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      const agentId = '507f1f77bcf86cd799439011';
      const updateAgentDto: UpdateAgentDto = {
        email: 'existing@example.com',
      };

      const error = new Error('Duplicate key');
      (error as any).code = 11000;

      (model.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      // Act & Assert
      await expect(service.update(agentId, updateAgentDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete an agent successfully', async () => {
      // Arrange
      const agentId = '507f1f77bcf86cd799439011';

      // findById mock (remove içinde çağrılıyor)
      (model.findById as jest.Mock) = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAgent),
      });

      (model.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAgent),
      });

      // Act
      await service.remove(agentId);

      // Assert
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        agentId,
        {
          deletedAt: expect.any(Date),
          deleted: true,
        },
      );
    });

    it('should throw NotFoundException when agent not found', async () => {
      // Arrange
      const agentId = '507f1f77bcf86cd799439011';

      (model.findById as jest.Mock) = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(service.remove(agentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
