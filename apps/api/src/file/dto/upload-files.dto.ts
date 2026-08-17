import { IsString, IsUUID } from 'class-validator';

export class UploadFilesDto {
  @IsUUID()
  @IsString()
  folderId!: string;
}
