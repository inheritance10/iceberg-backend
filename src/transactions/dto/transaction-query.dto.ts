import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyTypeEnum } from '../enums/property-type.enum';
import { CurrentStageEnum } from '../enums/current-stage.enum';

export class TransactionQueryDto {
  @ApiPropertyOptional({
    description: 'Stage filtresi',
    enum: CurrentStageEnum,
    example: CurrentStageEnum.AGREEMENT,
  })
  @IsOptional()
  @IsEnum(CurrentStageEnum)
  stage?: CurrentStageEnum;

  @ApiPropertyOptional({
    description: 'Mülk tipi filtresi',
    enum: PropertyTypeEnum,
    example: PropertyTypeEnum.SALE,
  })
  @IsOptional()
  @IsEnum(PropertyTypeEnum)
  propertyType?: PropertyTypeEnum;

  @ApiPropertyOptional({
    description: 'Sayfa numarası',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Sayfa başına kayıt sayısı',
    example: 10,
    minimum: 1,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}