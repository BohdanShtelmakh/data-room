import {
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { Readable } from 'node:stream';
import { PrismaService } from 'src/prisma/prisma.service';
import { ShareService } from 'src/share/share.service';
import { StorageService } from 'src/storage/storage.service';
import { FileService } from './file.service';

type PrismaMock = {
  file: Record<'findUnique' | 'findFirst' | 'update' | 'delete', jest.Mock>;
  folder: { findFirst: jest.Mock };
  share: { deleteMany: jest.Mock };
  $transaction: jest.Mock;
};
type ShareMock = { canReadFile: jest.Mock };
type StorageMock = Record<'get' | 'delete' | 'put', jest.Mock>;

describe('FileService', () => {
  const user = { id: 'user-1' } as User;
  let prisma: PrismaMock;
  let shares: ShareMock;
  let storage: StorageMock;
  let service: FileService;

  beforeEach(() => {
    prisma = {
      file: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      folder: { findFirst: jest.fn() },
      share: { deleteMany: jest.fn() },
      $transaction: jest.fn(),
    };
    shares = { canReadFile: jest.fn() };
    storage = { get: jest.fn(), delete: jest.fn(), put: jest.fn() };
    service = new FileService(
      prisma as unknown as PrismaService,
      shares as unknown as ShareService,
      storage as unknown as StorageService,
    );
  });

  it('returns authorized preview content with a safe content type', async () => {
    const file = { id: 'file-1', mimeType: 'text/html', url: 'key-1' };
    prisma.file.findUnique.mockResolvedValue(file);
    shares.canReadFile.mockResolvedValue(true);
    storage.get.mockResolvedValue({
      stream: Readable.from('<script>alert(1)</script>'),
      size: 25,
    });

    const result = await service.getContent(file.id, user, true);

    expect(result.contentType).toBe('text/plain; charset=utf-8');
    expect(storage.get).toHaveBeenCalledWith('key-1');
  });

  it('does not reveal whether an unauthorized file exists', async () => {
    prisma.file.findUnique.mockResolvedValue({ id: 'file-1' });
    shares.canReadFile.mockResolvedValue(false);

    await expect(service.findReadable('file-1', user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(storage.get).not.toHaveBeenCalled();
  });

  it('rejects unsupported previews before reading storage', async () => {
    prisma.file.findUnique.mockResolvedValue({
      id: 'file-1',
      mimeType: 'application/zip',
      url: 'key-1',
    });
    shares.canReadFile.mockResolvedValue(true);

    await expect(
      service.getContent('file-1', user, true),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    expect(storage.get).not.toHaveBeenCalled();
  });

  it('removes storage content without returning its key', async () => {
    const file = {
      id: 'file-1',
      name: 'report.pdf',
      originalName: 'report.pdf',
      mimeType: 'application/pdf',
      size: 100,
      folderId: 'folder-1',
      url: 'private-key',
    };
    prisma.file.findUnique.mockResolvedValue(file);
    prisma.file.delete.mockResolvedValue(file);
    prisma.$transaction.mockImplementation(
      (operation: (tx: PrismaMock) => Promise<unknown>) => operation(prisma),
    );

    const result = await service.remove(file.id, user);

    expect(storage.delete).toHaveBeenCalledWith('private-key');
    expect(prisma.share.deleteMany).toHaveBeenCalledWith({
      where: {
        resourceType: 'FILE',
        resourceId: file.id,
      },
    });
    expect(result).not.toHaveProperty('url');
  });
});
