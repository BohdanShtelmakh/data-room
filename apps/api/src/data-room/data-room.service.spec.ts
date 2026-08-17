import { Test, TestingModule } from '@nestjs/testing';
import { DataRoomService } from './data-room.service';

describe('DataRoomService', () => {
  let service: DataRoomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataRoomService],
    }).compile();

    service = module.get<DataRoomService>(DataRoomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
