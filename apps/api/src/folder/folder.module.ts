import { Module } from '@nestjs/common';
import { DataRoomModule } from 'src/data-room/data-room.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { FolderController } from './folder.controller';
import { FolderService } from './folder.service';
import { ShareModule } from 'src/share/share.module';

@Module({
  imports: [DataRoomModule, ShareModule],
  controllers: [FolderController],
  providers: [FolderService, PrismaService],
})
export class FolderModule {}
