import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { StageValidationService } from './stage-validation.service';
import { CurrentStageEnum } from '../enums/current-stage.enum';

describe('StageValidationService', () => {
  let service: StageValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StageValidationService],
    }).compile();

    service = module.get<StageValidationService>(StageValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateTransition', () => {
    // Geçerli geçişler
    it('should allow valid transition from AGREEMENT to EARNEST_MONEY', () => {
      // Act & Assert - Hata fırlatmamalı
      expect(() => {
        service.validateTransition(
          CurrentStageEnum.AGREEMENT,
          CurrentStageEnum.EARNEST_MONEY,
        );
      }).not.toThrow();
    });

    it('should allow valid transition from EARNEST_MONEY to TITLE_DEED', () => {
      expect(() => {
        service.validateTransition(
          CurrentStageEnum.EARNEST_MONEY,
          CurrentStageEnum.TITLE_DEED,
        );
      }).not.toThrow();
    });

    it('should allow valid transition from TITLE_DEED to COMPLETED', () => {
      expect(() => {
        service.validateTransition(
          CurrentStageEnum.TITLE_DEED,
          CurrentStageEnum.COMPLETED,
        );
      }).not.toThrow();
    });

    // Geçersiz geçişler
    it('should throw BadRequestException when transitioning to the same stage', () => {
      expect(() => {
        service.validateTransition(
          CurrentStageEnum.AGREEMENT,
          CurrentStageEnum.AGREEMENT,
        );
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when skipping stages (AGREEMENT to TITLE_DEED)', () => {
      expect(() => {
        service.validateTransition(
          CurrentStageEnum.AGREEMENT,
          CurrentStageEnum.TITLE_DEED,
        );
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when skipping stages (AGREEMENT to COMPLETED)', () => {
      expect(() => {
        service.validateTransition(
          CurrentStageEnum.AGREEMENT,
          CurrentStageEnum.COMPLETED,
        );
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when going backwards (EARNEST_MONEY to AGREEMENT)', () => {
      expect(() => {
        service.validateTransition(
          CurrentStageEnum.EARNEST_MONEY,
          CurrentStageEnum.AGREEMENT,
        );
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when going backwards (COMPLETED to TITLE_DEED)', () => {
      expect(() => {
        service.validateTransition(
          CurrentStageEnum.COMPLETED,
          CurrentStageEnum.TITLE_DEED,
        );
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when transitioning from COMPLETED to any stage', () => {
      expect(() => {
        service.validateTransition(
          CurrentStageEnum.COMPLETED,
          CurrentStageEnum.AGREEMENT,
        );
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException with correct error message', () => {
      try {
        service.validateTransition(
          CurrentStageEnum.AGREEMENT,
          CurrentStageEnum.COMPLETED,
        );
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Invalid transition');
        expect(error.message).toContain('AGREEMENT');
        expect(error.message).toContain('COMPLETED');
      }
    });
  });

  describe('isCompleted', () => {
    it('should return true when stage is COMPLETED', () => {
      expect(service.isCompleted(CurrentStageEnum.COMPLETED)).toBe(true);
    });

    it('should return false when stage is not COMPLETED', () => {
      expect(service.isCompleted(CurrentStageEnum.AGREEMENT)).toBe(false);
      expect(service.isCompleted(CurrentStageEnum.EARNEST_MONEY)).toBe(false);
      expect(service.isCompleted(CurrentStageEnum.TITLE_DEED)).toBe(false);
    });
  });

  describe('isNotCompleted', () => {
    it('should return false when stage is COMPLETED', () => {
      expect(service.isNotCompleted(CurrentStageEnum.COMPLETED)).toBe(false);
    });

    it('should return true when stage is not COMPLETED', () => {
      expect(service.isNotCompleted(CurrentStageEnum.AGREEMENT)).toBe(true);
      expect(service.isNotCompleted(CurrentStageEnum.EARNEST_MONEY)).toBe(true);
      expect(service.isNotCompleted(CurrentStageEnum.TITLE_DEED)).toBe(true);
    });
  });
});

