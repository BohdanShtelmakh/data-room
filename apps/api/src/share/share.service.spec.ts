import { NotFoundException } from '@nestjs/common';
import { ShareResourceType, ShareType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageService } from 'src/storage/storage.service';
import { ShareService } from './share.service';

type PrismaMock = {
  user: { findUnique: jest.Mock };
  file: Record<'findFirst' | 'findUnique', jest.Mock>;
  folder: Record<'findUnique' | 'findMany', jest.Mock>;
  dataRoom: { findFirst: jest.Mock };
  share: Record<'findFirst' | 'create', jest.Mock>;
};
type StorageMock = { get: jest.Mock };

describe('ShareService', () => {
  let prisma: PrismaMock;
  let storage: StorageMock;
  let service: ShareService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      file: { findFirst: jest.fn(), findUnique: jest.fn() },
      folder: { findUnique: jest.fn(), findMany: jest.fn() },
      dataRoom: { findFirst: jest.fn() },
      share: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    storage = { get: jest.fn() };
    service = new ShareService(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
    );
  });

  it('creates a public share only after verifying ownership', async () => {
    const dto = {
      type: ShareType.PUBLIC,
      resourceType: ShareResourceType.FILE,
      resourceId: 'file-1',
    };
    prisma.file.findFirst.mockResolvedValue({ id: 'file-1' });
    prisma.share.findFirst.mockResolvedValue(null);
    prisma.share.create.mockResolvedValue({ id: 'share-1', ...dto });

    await expect(service.create(dto, 'owner-1')).resolves.toMatchObject({
      id: 'share-1',
    });
    expect(prisma.file.findFirst).toHaveBeenCalledWith({
      where: { id: 'file-1', folder: { dataRoom: { ownerId: 'owner-1' } } },
    });
  });

  it('rejects email sharing to a user that does not exist', async () => {
    prisma.file.findFirst.mockResolvedValue({ id: 'file-1' });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        {
          type: ShareType.USER,
          resourceType: ShareResourceType.FILE,
          resourceId: 'file-1',
          email: 'missing@example.com',
        },
        'owner-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.share.create).not.toHaveBeenCalled();
  });

  it('grants read access through an active direct file share', async () => {
    prisma.file.findUnique.mockResolvedValue({ folderId: 'folder-1' });
    prisma.folder.findUnique.mockResolvedValue(null);
    prisma.share.findFirst.mockResolvedValue({ id: 'share-1' });

    await expect(service.canReadFile('user-1', 'file-1')).resolves.toBe(true);
    expect(prisma.share.findFirst).toHaveBeenCalledTimes(1);
  });
});
