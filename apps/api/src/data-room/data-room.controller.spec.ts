import { Test, TestingModule } from '@nestjs/testing';
import { DataRoomController } from './data-room.controller';
import { DataRoomService } from './data-room.service';

describe('DataRoomController', () => {
  let controller: DataRoomController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataRoomController],
      providers: [DataRoomService],
    }).compile();

    controller = module.get<DataRoomController>(DataRoomController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
