import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  // Posible specify data room if user can have multiple data rooms
  // @IsString()
  // @IsUUID()
  // dataRoomId!: string;

  @IsString()
  @IsUUID()
  @IsOptional()
  parentId?: string;
}
