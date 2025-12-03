import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsMongoId,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PropertyTypeEnum } from '../enums/property-type.enum';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Mülk ID',
    example: 'prop-123',
  })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({
    description: 'Mülk tipi',
    enum: PropertyTypeEnum,
    example: PropertyTypeEnum.SALE,
  })
  @IsEnum(PropertyTypeEnum)
  @IsNotEmpty()
  propertyType: PropertyTypeEnum;

  @ApiProperty({
    description: 'Toplam hizmet ücreti (komisyon)',
    example: 10000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  totalServiceFee: number;

  @ApiProperty({
    description: 'Listing agent ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsNotEmpty()
  listingAgentId: string;

  @ApiProperty({
    description: 'Selling agent ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439012',
  })
  @IsMongoId()
  @IsNotEmpty()
  sellingAgentId: string;
}
