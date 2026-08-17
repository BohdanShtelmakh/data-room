import { PartialType } from '@nestjs/mapped-types';
import { CreateDataRoomDto } from './create-data-room.dto';

export class UpdateDataRoomDto extends PartialType(CreateDataRoomDto) {}
