import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { User } from '@prisma/client';
import { memoryStorage } from 'multer';
import { Auth } from 'src/decorators/user.decorator';
import { UpdateFileDto } from 'src/file/dto/update-file.dto';
import { UploadFilesDto } from 'src/file/dto/upload-files.dto';
import { contentDisposition, fileMetadata } from './file-content';
import { FileService } from './file.service';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Get(':id')
  async findOne(@Param('id') id: string, @Auth() user: User) {
    const file = await this.fileService.findReadable(id, user);
    return fileMetadata(file);
  }

  @Get(':id/download')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async download(
    @Param('id') id: string,
    @Auth() user: User,
  ): Promise<StreamableFile> {
    const { file, size, stream } = await this.fileService.getContent(
      id,
      user,
      false,
    );
    return new StreamableFile(stream, {
      type: 'application/octet-stream',
      disposition: contentDisposition('attachment', file.name),
      length: size,
    });
  }

  @Get(':id/preview')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async preview(
    @Param('id') id: string,
    @Auth() user: User,
  ): Promise<StreamableFile> {
    const { file, contentType, size, stream } =
      await this.fileService.getContent(id, user, true);
    return new StreamableFile(stream, {
      type: contentType!,
      disposition: contentDisposition('inline', file.name),
      length: size,
    });
  }

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @Body() uploadFilesDto: UploadFilesDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Auth() user: User,
  ) {
    return this.fileService.upload(uploadFilesDto, files, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFileDto: UpdateFileDto,
    @Auth() user: User,
  ) {
    return this.fileService.update(id, updateFileDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Auth() user: User) {
    return this.fileService.remove(id, user);
  }
}
