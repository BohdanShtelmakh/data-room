import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ShareResourceType } from '@prisma/client';
import { DataRoomService } from 'src/data-room/data-room.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ShareService } from 'src/share/share.service';
import { StorageService } from 'src/storage/storage.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@Injectable()
export class FolderService {
  constructor(
    private prisma: PrismaService,
    private dataRoomService: DataRoomService,
    private shareService: ShareService,
    private storage: StorageService,
  ) {}
  async create(createFolderDto: CreateFolderDto, userId: string) {
    const [dataRoom] = await this.dataRoomService.findByUser(userId);
    if (!dataRoom) {
      throw new NotFoundException('Data room not found');
    }
    if (createFolderDto.parentId) {
      const parent = await this.prisma.folder.findFirst({
        where: {
          id: createFolderDto.parentId,
          dataRoomId: dataRoom.id,
          dataRoom: { ownerId: userId },
        },
      });
      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }
    }
    await this.ensureUniqueName(
      dataRoom.id,
      createFolderDto.parentId ?? null,
      createFolderDto.name,
    );
    try {
      return await this.prisma.folder.create({
        data: { ...createFolderDto, dataRoomId: dataRoom.id },
      });
    } catch (error) {
      this.rethrowUniqueName(error);
    }
  }

  findAllByUserId(userId: string) {
    return this.prisma.folder.findMany({
      where: {
        dataRoom: {
          ownerId: userId,
        },
      },
    });
  }

  async findContent(id: string, userId: string) {
    if (!(await this.shareService.canReadFolder(userId, id))) {
      throw new NotFoundException('Folder not found');
    }
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      include: {
        children: true,
        files: {
          omit: { url: true },
        },
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    return {
      folder: {
        id: folder.id,
        name: folder.name,
      },
      folders: folder.children,
      files: folder.files,
    };
  }

  async update(id: string, userId: string, updateFolderDto: UpdateFolderDto) {
    const folders = await this.prisma.folder.findMany({
      where: { dataRoom: { ownerId: userId } },
    });
    const folder = folders.find((candidate) => candidate.id === id);
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const parentId = updateFolderDto.parentId ?? folder.parentId;
    if (parentId) {
      const parent = folders.find((candidate) => candidate.id === parentId);
      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }
      let current = parent;
      while (current) {
        if (current.id === id) {
          throw new ConflictException(
            'Folder hierarchy cannot contain a cycle',
          );
        }
        const next = current.parentId
          ? folders.find((candidate) => candidate.id === current.parentId)
          : undefined;
        if (!next) break;
        current = next;
      }
    }

    await this.ensureUniqueName(
      folder.dataRoomId,
      parentId,
      updateFolderDto.name ?? folder.name,
      id,
    );
    try {
      return await this.prisma.folder.update({
        where: {
          id,
          dataRoom: {
            ownerId: userId,
          },
        },
        data: updateFolderDto,
      });
    } catch (error) {
      this.rethrowUniqueName(error);
    }
  }

  async remove(id: string, userId: string) {
    const folderIds = await this.ownedSubtreeIds(id, userId);
    const { deleted, files } = await this.prisma.$transaction(async (tx) => {
      const files = await tx.file.findMany({
        where: { folderId: { in: [...folderIds] } },
        select: { id: true, url: true },
      });
      await tx.share.deleteMany({
        where: {
          OR: [
            {
              resourceType: ShareResourceType.FOLDER,
              resourceId: { in: [...folderIds] },
            },
            {
              resourceType: ShareResourceType.FILE,
              resourceId: { in: files.map((file) => file.id) },
            },
          ],
        },
      });
      const deleted = await tx.folder.delete({ where: { id } });
      return { deleted, files };
    });
    const cleanup = await Promise.allSettled(
      files.map((file) => this.storage.delete(file.url)),
    );
    const failed = cleanup.some((result) => result.status === 'rejected');
    if (failed) {
      throw new InternalServerErrorException(
        'Folder deleted, but storage cleanup failed',
      );
    }
    return deleted;
  }

  async deletionImpact(id: string, userId: string) {
    const folderIds = await this.ownedSubtreeIds(id, userId);
    const files = await this.prisma.file.aggregate({
      where: { folderId: { in: [...folderIds] } },
      _count: { id: true },
      _sum: { size: true },
    });
    return {
      folderCount: folderIds.size,
      fileCount: files._count.id,
      totalSize: files._sum.size ?? 0,
    };
  }

  private async ownedSubtreeIds(id: string, userId: string) {
    const folders = await this.prisma.folder.findMany({
      where: { dataRoom: { ownerId: userId } },
      select: { id: true, parentId: true },
    });
    if (!folders.some((folder) => folder.id === id)) {
      throw new NotFoundException('Folder not found');
    }

    const folderIds = new Set([id]);
    let previousSize = 0;
    while (folderIds.size !== previousSize) {
      previousSize = folderIds.size;
      for (const folder of folders) {
        if (folder.parentId && folderIds.has(folder.parentId)) {
          folderIds.add(folder.id);
        }
      }
    }
    return folderIds;
  }

  private async ensureUniqueName(
    dataRoomId: string,
    parentId: string | null,
    name: string,
    excludeId?: string,
  ) {
    const duplicate = await this.prisma.folder.findFirst({
      where: {
        dataRoomId,
        parentId,
        name,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (duplicate) {
      throw new ConflictException('Folder with this name already exists');
    }
  }

  private rethrowUniqueName(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Folder with this name already exists');
    }
    throw error;
  }
}
