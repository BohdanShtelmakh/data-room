import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Share, ShareResourceType, ShareType } from '@prisma/client';
import { randomBytes } from 'crypto';
import { fileMetadata, previewContentType } from 'src/file/file-content';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageService } from 'src/storage/storage.service';
import { CreateShareDto } from './dto/create-share.dto';

@Injectable()
export class ShareService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async create(dto: CreateShareDto, ownerId: string) {
    await this.assertOwner(dto.resourceType, dto.resourceId, ownerId);
    const recipient =
      dto.type === ShareType.USER
        ? await this.prisma.user.findUnique({ where: { email: dto.email! } })
        : null;
    if (dto.type === ShareType.USER && !recipient)
      throw new NotFoundException('User not found');
    if (recipient?.id === ownerId)
      throw new ConflictException('You already own this resource');

    const duplicate = await this.prisma.share.findFirst({
      where: {
        type: dto.type,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        createdById: ownerId,
        userId: recipient?.id ?? null,
      },
    });
    if (duplicate) throw new ConflictException('This share already exists');

    return this.prisma.share.create({
      data: {
        type: dto.type,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        userId: recipient?.id,
        createdById: ownerId,
        token: randomBytes(32).toString('base64url'),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  findCreated(ownerId: string) {
    return this.prisma.share.findMany({
      where: { createdById: ownerId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findReceived(userId: string) {
    const shares = await this.prisma.share.findMany({
      where: { userId, ...this.activeWhere() },
      include: { createdBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(
      shares.map(async (share) => ({
        ...share,
        resource: await this.getResourceSummary(
          share.resourceType,
          share.resourceId,
        ),
      })),
    );
  }

  async remove(id: string, ownerId: string) {
    const share = await this.prisma.share.findFirst({
      where: { id, createdById: ownerId },
    });
    if (!share) throw new NotFoundException('Share not found');
    return this.prisma.share.delete({ where: { id } });
  }

  async canReadFolder(userId: string, folderId: string) {
    const scope = await this.getFolderScope(folderId);
    if (!scope) return false;
    if (scope.ownerId === userId) return true;
    return Boolean(
      await this.prisma.share.findFirst({
        where: {
          userId,
          AND: [
            this.activeWhere(),
            {
              OR: [
                {
                  resourceType: ShareResourceType.DATAROOM,
                  resourceId: scope.dataRoomId,
                },
                {
                  resourceType: ShareResourceType.FOLDER,
                  resourceId: { in: scope.ancestorIds },
                },
              ],
            },
          ],
        },
      }),
    );
  }

  async canReadFile(userId: string, fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: { folderId: true },
    });
    if (!file) return false;
    if (await this.canReadFolder(userId, file.folderId)) return true;
    return Boolean(
      await this.prisma.share.findFirst({
        where: {
          userId,
          resourceType: ShareResourceType.FILE,
          resourceId: fileId,
          ...this.activeWhere(),
        },
      }),
    );
  }

  async getPublicResource(token: string) {
    const share = await this.getPublicShare(token);
    if (share.resourceType === ShareResourceType.DATAROOM) {
      const room = await this.prisma.dataRoom.findUnique({
        where: { id: share.resourceId },
        select: { id: true, name: true, createdAt: true, updatedAt: true },
      });
      if (!room) throw new NotFoundException('Shared resource not found');
      const folders = await this.prisma.folder.findMany({
        where: { dataRoomId: room.id, parentId: null },
        select: { id: true, name: true, parentId: true },
      });
      return {
        share: this.publicShareInfo(share),
        resource: { ...room, kind: 'DATAROOM', folders, files: [] },
      };
    }
    if (share.resourceType === ShareResourceType.FOLDER) {
      return {
        share: this.publicShareInfo(share),
        resource: {
          ...(await this.publicFolderContent(share, share.resourceId)),
          kind: 'FOLDER',
        },
      };
    }
    const file = await this.publicFile(share, share.resourceId, false);
    return {
      share: this.publicShareInfo(share),
      resource: { ...fileMetadata(file), kind: 'FILE' },
    };
  }

  async getPublicFolder(token: string, folderId: string) {
    const share = await this.getPublicShare(token);
    return this.publicFolderContent(share, folderId);
  }

  async getPublicFile(token: string, fileId: string, preview: boolean) {
    const share = await this.getPublicShare(token);
    const file = await this.publicFile(share, fileId, preview);
    const contentType = preview ? previewContentType(file.mimeType) : null;
    return { file, contentType, ...(await this.storage.get(file.url)) };
  }

  private async publicFolderContent(share: Share, folderId: string) {
    if (!(await this.shareContainsFolder(share, folderId)))
      throw new NotFoundException('Shared folder not found');
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        children: { select: { id: true, name: true, parentId: true } },
        files: { omit: { url: true } },
      },
    });
    if (!folder) throw new NotFoundException('Shared folder not found');
    return {
      folder: { id: folder.id, name: folder.name, parentId: folder.parentId },
      folders: folder.children,
      files: folder.files,
    };
  }

  private async publicFile(share: Share, fileId: string, preview: boolean) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || !(await this.shareContainsFile(share, file)))
      throw new NotFoundException('Shared file not found');
    if (preview && !previewContentType(file.mimeType))
      throw new UnsupportedMediaTypeException(
        'This file type cannot be previewed safely',
      );
    return file;
  }

  private async shareContainsFolder(share: Share, folderId: string) {
    if (share.resourceType === ShareResourceType.FILE) return false;
    const scope = await this.getFolderScope(folderId);
    if (!scope) return false;
    if (share.resourceType === ShareResourceType.DATAROOM)
      return scope.dataRoomId === share.resourceId;
    return scope.ancestorIds.includes(share.resourceId);
  }

  private async shareContainsFile(
    share: Share,
    file: { id: string; folderId: string },
  ) {
    return share.resourceType === ShareResourceType.FILE
      ? share.resourceId === file.id
      : this.shareContainsFolder(share, file.folderId);
  }

  private async getFolderScope(folderId: string) {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      include: { dataRoom: { select: { ownerId: true } } },
    });
    if (!folder) return null;
    const folders = await this.prisma.folder.findMany({
      where: { dataRoomId: folder.dataRoomId },
      select: { id: true, parentId: true },
    });
    const ancestorIds = [folder.id];
    let parentId = folder.parentId;
    while (parentId) {
      ancestorIds.push(parentId);
      parentId = folders.find((item) => item.id === parentId)?.parentId ?? null;
    }
    return {
      dataRoomId: folder.dataRoomId,
      ownerId: folder.dataRoom.ownerId,
      ancestorIds,
    };
  }

  private async assertOwner(
    type: ShareResourceType,
    id: string,
    ownerId: string,
  ) {
    const exists =
      type === ShareResourceType.DATAROOM
        ? await this.prisma.dataRoom.findFirst({ where: { id, ownerId } })
        : type === ShareResourceType.FOLDER
          ? await this.prisma.folder.findFirst({
              where: { id, dataRoom: { ownerId } },
            })
          : await this.prisma.file.findFirst({
              where: { id, folder: { dataRoom: { ownerId } } },
            });
    if (!exists)
      throw new ForbiddenException('Only the owner can share this resource');
  }

  private async getPublicShare(token: string) {
    const share = await this.prisma.share.findFirst({
      where: { token, type: ShareType.PUBLIC, ...this.activeWhere() },
    });
    if (!share) throw new NotFoundException('Share link not found or expired');
    return share;
  }

  private activeWhere() {
    return { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };
  }

  private publicShareInfo(share: Share) {
    return {
      token: share.token,
      resourceType: share.resourceType,
      expiresAt: share.expiresAt,
    };
  }

  private async getResourceSummary(type: ShareResourceType, id: string) {
    if (type === ShareResourceType.DATAROOM)
      return this.prisma.dataRoom.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          folders: { where: { parentId: null } },
        },
      });
    if (type === ShareResourceType.FOLDER)
      return this.prisma.folder.findUnique({
        where: { id },
        select: { id: true, name: true },
      });
    return this.prisma.file.findUnique({
      where: { id },
      select: { id: true, name: true, mimeType: true, size: true },
    });
  }
}
