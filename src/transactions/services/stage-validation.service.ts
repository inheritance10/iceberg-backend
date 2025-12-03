import { Injectable, BadRequestException } from '@nestjs/common';
import { CurrentStageEnum } from '../enums/current-stage.enum';

/**
 * Geçerli stage geçişleri
 * Sadece ileriye doğru geçişlere izin veriyoruz.
 */
const VALID_TRANSITIONS: Record<CurrentStageEnum, CurrentStageEnum[]> = {
  [CurrentStageEnum.AGREEMENT]: [CurrentStageEnum.EARNEST_MONEY],
  [CurrentStageEnum.EARNEST_MONEY]: [CurrentStageEnum.TITLE_DEED],
  [CurrentStageEnum.TITLE_DEED]: [CurrentStageEnum.COMPLETED],
  [CurrentStageEnum.COMPLETED]: [], // Completed'dan sonra geçiş yok.
} as const;

@Injectable()
export class StageValidationService {
  /**
   * Stage geçişinin geçerli olup olmadığını kontrol ediyoruz.
   * @param currentStage - Mevcut stage
   * @param newStage - Yeni stage
   * @throws BadRequestException - Geçiş geçersizse fırlatıyoruz.
   */
  validateTransition(
    currentStage: CurrentStageEnum,
    newStage: CurrentStageEnum,
  ): void {
    // Aynı stage'e geçiş yapılmasını engelliyoruz.
    if (currentStage === newStage) {
      throw new BadRequestException(
        `Cannot transition to the same stage: ${currentStage}`,
      );
    }

    // Geçerli geçişleri kontrol ediyoruz.
    const validNextStages = VALID_TRANSITIONS[currentStage];

    if (!validNextStages.includes(newStage)) {
      throw new BadRequestException(
        `Invalid transition from ${currentStage} to ${newStage}. ` +
          `Valid next stages: ${validNextStages.join(', ') || 'none'}`,
      );
    }
  }

  /**
   * Stage'in completed olup olmadığını kontrol ediyoruz.
   */
  isCompleted(stage: CurrentStageEnum): boolean {
    return stage === CurrentStageEnum.COMPLETED;
  }

  /**
   * Stage'in completed olmadığını kontrol ediyoruz.
   */
  isNotCompleted(stage: CurrentStageEnum): boolean {
    return !this.isCompleted(stage);
  }
}

