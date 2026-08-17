import { Controller, Get } from '@nestjs/common';
import type { User } from '@prisma/client';
import { Auth } from 'src/decorators/user.decorator';
import { DataRoomService } from './data-room.service';

@Controller('data-room')
export class DataRoomController {
  constructor(private readonly dataRoomService: DataRoomService) {}

  @Get()
  findMyDataRooms(@Auth() user: User) {
    return this.dataRoomService.findByUser(user.id);
  }
}
