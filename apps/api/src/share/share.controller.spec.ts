import { ShareResourceType, ShareType, type User } from '@prisma/client';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';

describe('ShareController', () => {
  const service = { create: jest.fn(), remove: jest.fn() };
  const controller = new ShareController(service as unknown as ShareService);
  const user = { id: 'owner-1' } as User;

  beforeEach(() => jest.clearAllMocks());

  it('uses the authenticated user as share owner', async () => {
    const dto = {
      type: ShareType.PUBLIC,
      resourceType: ShareResourceType.FILE,
      resourceId: 'file-1',
    };
    await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith(dto, user.id);
  });

  it('allows only the authenticated owner to revoke through the service', async () => {
    await controller.remove('share-1', user);
    expect(service.remove).toHaveBeenCalledWith('share-1', user.id);
  });
});
