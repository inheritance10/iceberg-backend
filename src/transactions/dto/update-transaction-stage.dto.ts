import { CurrentStageEnum } from '../enums/current-stage.enum';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTransactionStageDto {
  @ApiProperty({
    description: 'Yeni stage',
    enum: CurrentStageEnum,
    example: CurrentStageEnum.EARNEST_MONEY,
  })
  @IsEnum(CurrentStageEnum)
  @IsNotEmpty()
  stage: CurrentStageEnum;

  @ApiProperty({
    description: 'Stage geçişi için notlar (opsiyonel)',
    example: 'Kapora ödendi',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
