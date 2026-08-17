import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDataRoomDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsUUID()
  ownerId!: string;
}
