import { IsString, IsNotEmpty, IsEmail, IsEnum, IsNumber, IsMongoId } from 'class-validator';
import { PropertyTypeEnum } from '../enums/property-type.enum';
import { Types } from 'mongoose';
import { Min } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @IsEnum(PropertyTypeEnum)
  @IsNotEmpty()
  propertyType: PropertyTypeEnum;

  @IsNumber()
  @Min(0)
  totalServiceFee: number;

  @IsMongoId()
  @IsNotEmpty()     
  listingAgentId: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  sellingAgentId: Types.ObjectId;
}
