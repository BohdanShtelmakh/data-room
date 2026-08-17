import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { ShareModule } from 'src/share/share.module';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [ShareModule, StorageModule],
  controllers: [FileController],
  providers: [FileService, PrismaService],
})
export class FileModule {}
