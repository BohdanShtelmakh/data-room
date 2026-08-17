import type { User } from '@prisma/client';
import { DataRoomController } from './data-room.controller';
import { DataRoomService } from './data-room.service';

describe('DataRoomController', () => {
  it('loads only the authenticated user data rooms', async () => {
    const service = { findByUser: jest.fn() };
    const controller = new DataRoomController(
      service as unknown as DataRoomService,
    );

    await controller.findMyDataRooms({ id: 'user-1' } as User);

    expect(service.findByUser).toHaveBeenCalledWith('user-1');
  });
});
