import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  StreamableFile,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { Auth } from 'src/decorators/user.decorator';
import { Public } from 'src/decorators/public.decorator';
import { contentDisposition } from 'src/file/file-content';
import { CreateShareDto } from './dto/create-share.dto';
import { ShareService } from './share.service';

@Controller('share')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Post()
  create(@Body() dto: CreateShareDto, @Auth() user: User) {
    return this.shareService.create(dto, user.id);
  }

  @Get()
  findCreated(@Auth() user: User) {
    return this.shareService.findCreated(user.id);
  }

  @Get('received')
  findReceived(@Auth() user: User) {
    return this.shareService.findReceived(user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Auth() user: User) {
    return this.shareService.remove(id, user.id);
  }

  @Public()
  @Get('public/:token')
  getPublicResource(@Param('token') token: string) {
    return this.shareService.getPublicResource(token);
  }

  @Public()
  @Get('public/:token/folder/:folderId')
  getPublicFolder(
    @Param('token') token: string,
    @Param('folderId') folderId: string,
  ) {
    return this.shareService.getPublicFolder(token, folderId);
  }

  @Public()
  @Get('public/:token/file/:fileId/download')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async download(
    @Param('token') token: string,
    @Param('fileId') fileId: string,
  ) {
    const { file, size, stream } = await this.shareService.getPublicFile(
      token,
      fileId,
      false,
    );
    return new StreamableFile(stream, {
      type: 'application/octet-stream',
      disposition: contentDisposition('attachment', file.name),
      length: size,
    });
  }

  @Public()
  @Get('public/:token/file/:fileId/preview')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async preview(
    @Param('token') token: string,
    @Param('fileId') fileId: string,
  ) {
    const { file, contentType, size, stream } =
      await this.shareService.getPublicFile(token, fileId, true);
    return new StreamableFile(stream, {
      type: contentType!,
      disposition: contentDisposition('inline', file.name),
      length: size,
    });
  }
}
