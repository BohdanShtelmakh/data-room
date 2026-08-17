import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { ShareModule } from 'src/share/share.module';

@Module({
  imports: [ShareModule],
  controllers: [FileController],
  providers: [FileService, PrismaService],
})
export class FileModule {}
