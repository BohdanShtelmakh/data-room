import type { User } from '@prisma/client';
import { FolderController } from './folder.controller';
import { FolderService } from './folder.service';

describe('FolderController', () => {
  const service = { create: jest.fn(), findContent: jest.fn() };
  const controller = new FolderController(service as unknown as FolderService);
  const user = { id: 'user-1' } as User;

  beforeEach(() => jest.clearAllMocks());

  it('passes ownership context when creating a folder', async () => {
    const dto = { name: 'Documents' };
    await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith(dto, user.id);
  });

  it('passes access context when loading folder content', async () => {
    await controller.findContent('folder-1', user);
    expect(service.findContent).toHaveBeenCalledWith('folder-1', user.id);
  });
});
