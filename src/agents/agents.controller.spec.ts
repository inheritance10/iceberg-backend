import { Test, TestingModule } from '@nestjs/testing';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

describe('AgentsController', () => {
  let controller: AgentsController;
  let service: AgentsService;

  const mockAgent = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Ahmet Yılmaz',
    email: 'ahmet@example.com',
    phone: '05551234567',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAgentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [
        {
          provide: AgentsService,
          useValue: mockAgentsService,
        },
      ],
    }).compile();

    controller = module.get<AgentsController>(AgentsController);
    service = module.get<AgentsService>(AgentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an agent', async () => {
      // Arrange
      const createAgentDto: CreateAgentDto = {
        name: 'Ahmet Yılmaz',
        email: 'ahmet@example.com',
        phone: '05551234567',
      };

      mockAgentsService.create.mockResolvedValue(mockAgent);

      // Act
      const result = await controller.create(createAgentDto);

      // Assert
      expect(result).toEqual(mockAgent);
      expect(mockAgentsService.create).toHaveBeenCalledWith(createAgentDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of agents', async () => {
      // Arrange
      const agents = [mockAgent];
      mockAgentsService.findAll.mockResolvedValue(agents);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toEqual(agents);
      expect(mockAgentsService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an agent by id', async () => {
      // Arrange
      const agentId = '507f1f77bcf86cd799439011';
      mockAgentsService.findOne.mockResolvedValue(mockAgent);

      // Act
      const result = await controller.findOne(agentId);

      // Assert
      expect(result).toEqual(mockAgent);
      expect(mockAgentsService.findOne).toHaveBeenCalledWith(agentId);
    });
  });

  describe('update', () => {
    it('should update an agent', async () => {
      // Arrange
      const agentId = '507f1f77bcf86cd799439011';
      const updateAgentDto: UpdateAgentDto = {
        name: 'Ahmet Yılmaz Updated',
      };

      const updatedAgent = {
        ...mockAgent,
        ...updateAgentDto,
      };

      mockAgentsService.update.mockResolvedValue(updatedAgent);

      // Act
      const result = await controller.update(agentId, updateAgentDto);

      // Assert
      expect(result).toEqual(updatedAgent);
      expect(mockAgentsService.update).toHaveBeenCalledWith(
        agentId,
        updateAgentDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove an agent', async () => {
      // Arrange
      const agentId = '507f1f77bcf86cd799439011';
      mockAgentsService.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove(agentId);

      // Assert
      expect(mockAgentsService.remove).toHaveBeenCalledWith(agentId);
    });
  });
});
