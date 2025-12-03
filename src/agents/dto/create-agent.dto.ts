import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty({
    description: 'Acente adı',
    example: 'Ahmet Yılmaz',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Acente email adresi (unique)',
    example: 'ahmet@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Acente telefon numarası',
    example: '05551234567',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
