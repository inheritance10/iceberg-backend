import { IsEnum, IsOptional, IsString } from "class-validator";
import { PropertyTypeEnum } from "../enums/property-type.enum";

export class TransactionQueryDto {
     @IsOptional()
     @IsString()
     stage?: string;

     @IsOptional()
     @IsEnum(PropertyTypeEnum)
     propertyType?: PropertyTypeEnum;

     @IsOptional()
     page?: number;

     @IsOptional()
     limit?: number;
}