import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateFileDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsUUID()
  @IsOptional()
  folderId?: string;
}
