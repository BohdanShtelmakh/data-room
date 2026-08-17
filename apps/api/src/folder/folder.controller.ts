import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { Auth } from 'src/decorators/user.decorator';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FolderService } from './folder.service';

@Controller('folder')
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Post()
  create(@Body() createFolderDto: CreateFolderDto, @Auth() user: User) {
    return this.folderService.create(createFolderDto, user.id);
  }

  @Get()
  findAll(@Auth() user: User) {
    return this.folderService.findAllByUserId(user.id);
  }

  @Get(':id/content')
  findContent(@Param('id') id: string, @Auth() user: User) {
    return this.folderService.findContent(id, user.id);
  }

  @Get(':id/deletion-impact')
  deletionImpact(@Param('id') id: string, @Auth() user: User) {
    return this.folderService.deletionImpact(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Auth() user: User,
    @Body() updateFolderDto: UpdateFolderDto,
  ) {
    return this.folderService.update(id, user.id, updateFolderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Auth() user: User) {
    return this.folderService.remove(id, user.id);
  }
}
