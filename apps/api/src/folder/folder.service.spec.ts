import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataRoomService } from 'src/data-room/data-room.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ShareService } from 'src/share/share.service';
import { StorageService } from 'src/storage/storage.service';
import { FolderService } from './folder.service';

type PrismaMock = {
  folder: Record<'findFirst' | 'findMany' | 'findUnique' | 'update', jest.Mock>;
  file: { aggregate: jest.Mock };
  $transaction: jest.Mock;
};
type DataRoomMock = { findByUser: jest.Mock };
type ShareMock = { canReadFolder: jest.Mock };
type StorageMock = { delete: jest.Mock };
type TransactionMock = {
  file: { findMany: jest.Mock };
  share: { deleteMany: jest.Mock };
  folder: { delete: jest.Mock };
};

describe('FolderService', () => {
  let prisma: PrismaMock;
  let dataRooms: DataRoomMock;
  let shares: ShareMock;
  let storage: StorageMock;
  let service: FolderService;

  beforeEach(() => {
    prisma = {
      folder: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      file: { aggregate: jest.fn() },
      $transaction: jest.fn(),
    };
    dataRooms = { findByUser: jest.fn() };
    shares = { canReadFolder: jest.fn() };
    storage = { delete: jest.fn() };
    service = new FolderService(
      prisma as unknown as PrismaService,
      dataRooms as unknown as DataRoomService,
      shares as unknown as ShareService,
      storage as unknown as StorageService,
    );
  });

  it('returns content when the user has read access', async () => {
    shares.canReadFolder.mockResolvedValue(true);
    prisma.folder.findUnique.mockResolvedValue({
      id: 'folder-1',
      name: 'Documents',
      children: [],
      files: [],
    });

    await expect(service.findContent('folder-1', 'user-1')).resolves.toEqual({
      folder: { id: 'folder-1', name: 'Documents' },
      folders: [],
      files: [],
    });
  });

  it('hides a folder when the user lacks read access', async () => {
    shares.canReadFolder.mockResolvedValue(false);

    await expect(
      service.findContent('folder-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.folder.findUnique).not.toHaveBeenCalled();
  });

  it('rejects moving a folder below its own descendant', async () => {
    prisma.folder.findMany.mockResolvedValue([
      { id: 'parent', parentId: null, dataRoomId: 'room-1', name: 'Parent' },
      { id: 'child', parentId: 'parent', dataRoomId: 'room-1', name: 'Child' },
    ]);

    await expect(
      service.update('parent', 'user-1', { parentId: 'child' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.folder.update).not.toHaveBeenCalled();
  });

  it('reports the complete deletion impact for a subtree', async () => {
    prisma.folder.findMany.mockResolvedValue([
      { id: 'parent', parentId: null },
      { id: 'child', parentId: 'parent' },
      { id: 'other', parentId: null },
    ]);
    prisma.file.aggregate.mockResolvedValue({
      _count: { id: 3 },
      _sum: { size: 1500 },
    });

    await expect(service.deletionImpact('parent', 'user-1')).resolves.toEqual({
      folderCount: 2,
      fileCount: 3,
      totalSize: 1500,
    });
    expect(prisma.file.aggregate).toHaveBeenCalledWith({
      where: { folderId: { in: ['parent', 'child'] } },
      _count: { id: true },
      _sum: { size: true },
    });
  });

  it('deletes subtree shares and stored files with the folder', async () => {
    prisma.folder.findMany.mockResolvedValue([
      { id: 'parent', parentId: null },
      { id: 'child', parentId: 'parent' },
    ]);
    const tx: TransactionMock = {
      file: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'file-1', url: 'storage-key' }]),
      },
      share: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      folder: {
        delete: jest.fn().mockResolvedValue({ id: 'parent', name: 'Parent' }),
      },
    };
    prisma.$transaction.mockImplementation(
      (operation: (transaction: TransactionMock) => Promise<unknown>) =>
        operation(tx),
    );
    storage.delete.mockResolvedValue(undefined);

    await expect(service.remove('parent', 'user-1')).resolves.toMatchObject({
      id: 'parent',
    });
    expect(tx.share.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { resourceType: 'FOLDER', resourceId: { in: ['parent', 'child'] } },
          { resourceType: 'FILE', resourceId: { in: ['file-1'] } },
        ],
      },
    });
    expect(storage.delete).toHaveBeenCalledWith('storage-key');
  });
});
