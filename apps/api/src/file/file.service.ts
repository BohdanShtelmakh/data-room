import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Prisma, ShareResourceType, type User } from '@prisma/client';
import { UpdateFileDto } from 'src/file/dto/update-file.dto';
import { UploadFilesDto } from 'src/file/dto/upload-files.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ShareService } from 'src/share/share.service';
import { StorageService } from 'src/storage/storage.service';
import { fileMetadata, previewContentType } from './file-content';

@Injectable()
export class FileService {
  constructor(
    private prisma: PrismaService,
    private shareService: ShareService,
    private storage: StorageService,
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
    const contentType = preview ? previewContentType(file.mimeType) : null;
    if (preview && !contentType) {
      throw new UnsupportedMediaTypeException(
        'This file type cannot be previewed safely',
      );
    }
    return { file, contentType, ...(await this.storage.get(file.url)) };
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
    const storedKeys: string[] = [];
    const cleanup = () =>
      Promise.allSettled(storedKeys.map((key) => this.storage.delete(key)));

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

      const storedFiles: Array<{ file: Express.Multer.File; key: string }> = [];
      for (const file of files) {
        const stored = await this.storage.put(file);
        storedKeys.push(stored.key);
        storedFiles.push({ file, key: stored.key });
      }

      return await this.prisma.file.createMany({
        data: storedFiles.map(({ file, key }) => ({
          name: file.originalname,
          originalName: file.originalname,
          url: key,
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
      const updated = await this.prisma.file.update({
        where: {
          id,
        },
        data: {
          name: targetName,
          folderId: targetFolderId,
        },
      });
      return fileMetadata(updated);
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

    const deleted = await this.prisma.$transaction(async (tx) => {
      await tx.share.deleteMany({
        where: {
          resourceType: ShareResourceType.FILE,
          resourceId: id,
        },
      });
      return tx.file.delete({ where: { id } });
    });

    await this.storage.delete(file.url);
    return fileMetadata(deleted);
  }
}
