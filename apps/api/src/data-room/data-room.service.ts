import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { UpdateDataRoomDto } from './dto/update-data-room.dto';

@Injectable()
export class DataRoomService {
  constructor(private prisma: PrismaService) {}
  create(createDataRoomDto: CreateDataRoomDto) {
    return this.prisma.dataRoom.create({
      data: {
        name: createDataRoomDto.name,
        ownerId: createDataRoomDto.ownerId,
      },
    });
  }

  findByUser(userId: string) {
    return this.prisma.dataRoom.findMany({
      where: {
        ownerId: userId,
      },
      include: {
        folders: true,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.dataRoom.findUnique({
      where: {
        id,
      },
      include: {
        folders: true,
      },
    });
  }

  updateByUser(userId: string, updateDataRoomDto: UpdateDataRoomDto) {
    return this.prisma.dataRoom.updateMany({
      where: {
        ownerId: userId,
      },
      data: {
        name: updateDataRoomDto.name,
        ownerId: updateDataRoomDto.ownerId,
      },
    });
  }

  update(id: string, updateDataRoomDto: UpdateDataRoomDto) {
    return this.prisma.dataRoom.update({
      where: {
        id,
      },
      data: {
        name: updateDataRoomDto.name,
        ownerId: updateDataRoomDto.ownerId,
      },
    });
  }

  remove(id: string) {
    return this.prisma.dataRoom.delete({
      where: {
        id,
      },
    });
  }
}
