import { CurrentStageEnum } from '../enums/current-stage.enum';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class UpdateTransactionStageDto {
     @IsEnum(CurrentStageEnum)
     @IsNotEmpty()
     stage: CurrentStageEnum; 

     @IsString()
     @IsNotEmpty()
     notes?: string;
}
