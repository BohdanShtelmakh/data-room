import type { User } from '@prisma/client';
import { FileController } from './file.controller';
import { FileService } from './file.service';

describe('FileController', () => {
  const user = { id: 'user-1' } as User;
  const fileService = {
    upload: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const controller = new FileController(fileService as unknown as FileService);

  beforeEach(() => jest.clearAllMocks());

  it('passes the authenticated user to uploads', async () => {
    const files = [{ originalname: 'report.pdf' }] as Express.Multer.File[];
    await controller.upload({ folderId: 'folder-1' }, files, user);

    expect(fileService.upload).toHaveBeenCalledWith(
      { folderId: 'folder-1' },
      files,
      user,
    );
  });

  it('passes the authenticated user to file deletion', async () => {
    await controller.remove('file-1', user);
    expect(fileService.remove).toHaveBeenCalledWith('file-1', user);
  });
});
