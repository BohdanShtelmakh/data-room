import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Prisma, type User } from '@prisma/client';
import { stat, unlink } from 'fs/promises';
import { UpdateFileDto } from 'src/file/dto/update-file.dto';
import { UploadFilesDto } from 'src/file/dto/upload-files.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ShareService } from 'src/share/share.service';

@Injectable()
export class FileService {
  constructor(
    private prisma: PrismaService,
    private shareService: ShareService,
  ) {}

  async findOne(id: string, user: User) {
    const file = await this.prisma.file.findUnique({
      where: {
        id,
        folder: {
          dataRoom: {
            ownerId: user.id,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }
    return file;
  }

  async getContent(id: string, user: User, preview: boolean) {
    const file = await this.findReadable(id, user);
    if (preview && !this.isPreviewable(file.mimeType)) {
      throw new UnsupportedMediaTypeException(
        'This file type cannot be previewed safely',
      );
    }
    try {
      const fileStats = await stat(file.url);
      if (!fileStats.isFile()) throw new Error('Not a file');
      return { file, size: fileStats.size };
    } catch {
      throw new NotFoundException('File content not found');
    }
  }

  async findReadable(id: string, user: User) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file || !(await this.shareService.canReadFile(user.id, id))) {
      throw new NotFoundException('File not found');
    }
    return file;
  }

  async upload(
    uploadFilesDto: UploadFilesDto,
    files: Array<Express.Multer.File> = [],
    user: User,
  ) {
    const cleanup = () =>
      Promise.allSettled(files.map((file) => unlink(file.path)));

    try {
      if (files.length === 0) {
        throw new BadRequestException('At least one file is required');
      }

      const folder = await this.prisma.folder.findFirst({
        where: {
          id: uploadFilesDto.folderId,
          dataRoom: { ownerId: user.id },
        },
      });
      if (!folder) {
        throw new NotFoundException('Folder not found');
      }

      const names = files.map((file) => file.originalname);
      if (new Set(names).size !== names.length) {
        throw new ConflictException('Duplicate file names in upload');
      }
      const duplicate = await this.prisma.file.findFirst({
        where: { folderId: folder.id, name: { in: names } },
      });
      if (duplicate) {
        throw new ConflictException('File with this name already exists');
      }

      return await this.prisma.file.createMany({
        data: files.map((file) => ({
          name: file.originalname,
          originalName: file.originalname,
          url: file.path,
          mimeType: file.mimetype,
          size: file.size,
          folderId: folder.id,
        })),
      });
    } catch (error) {
      await cleanup();
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('File with this name already exists');
      }
      throw error;
    }
  }

  async update(id: string, updateFileDto: UpdateFileDto, user: User) {
    const file = await this.findOne(id, user);

    if (updateFileDto.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: {
          id: updateFileDto.folderId,
          dataRoom: {
            ownerId: user.id,
          },
        },
      });

      if (!folder) {
        throw new NotFoundException('Folder not found');
      }
    }

    const targetFolderId = updateFileDto.folderId ?? file.folderId;
    const targetName = updateFileDto.name ?? file.name;
    const duplicate = await this.prisma.file.findFirst({
      where: {
        folderId: targetFolderId,
        name: targetName,
        id: {
          not: id,
        },
      },
    });

    if (duplicate) {
      throw new ConflictException('File with this name already exists');
    }

    try {
      return await this.prisma.file.update({
        where: {
          id,
        },
        data: {
          name: targetName,
          folderId: targetFolderId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('File with this name already exists');
      }
      throw error;
    }
  }

  async remove(id: string, user: User) {
    const file = await this.findOne(id, user);

    const deleted = await this.prisma.file.delete({
      where: {
        id,
      },
    });

    try {
      await unlink(file.url);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new InternalServerErrorException(
          'File deleted, but storage cleanup failed',
        );
      }
    }
    return deleted;
  }

  private isPreviewable(mimeType: string) {
    return (
      mimeType.startsWith('image/') ||
      mimeType.startsWith('audio/') ||
      mimeType.startsWith('video/') ||
      mimeType.startsWith('text/') ||
      mimeType === 'application/pdf' ||
      mimeType === 'application/json' ||
      mimeType === 'application/xml' ||
      mimeType.endsWith('+json') ||
      mimeType.endsWith('+xml')
    );
  }
}
