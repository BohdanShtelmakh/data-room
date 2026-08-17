import { DataRoomService } from './data-room.service';

describe('DataRoomService', () => {
  it('filters data rooms by owner', async () => {
    const prisma = { dataRoom: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new DataRoomService(prisma as never);

    await service.findByUser('user-1');

    expect(prisma.dataRoom.findMany).toHaveBeenCalledWith({
      where: { ownerId: 'user-1' },
      include: { folders: true },
    });
  });
});
