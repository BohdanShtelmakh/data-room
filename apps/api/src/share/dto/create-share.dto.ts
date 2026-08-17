import { ShareResourceType, ShareType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class CreateShareDto {
  @IsEnum(ShareType)
  type!: ShareType;

  @IsEnum(ShareResourceType)
  resourceType!: ShareResourceType;

  @IsUUID()
  resourceId!: string;

  @ValidateIf((dto: CreateShareDto) => dto.type === ShareType.USER)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
