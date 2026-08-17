import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DataRoomController } from './data-room.controller';
import { DataRoomService } from './data-room.service';

@Module({
  controllers: [DataRoomController],
  providers: [DataRoomService, PrismaService],
  exports: [DataRoomService],
})
export class DataRoomModule {}
