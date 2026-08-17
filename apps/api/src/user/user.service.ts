import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  public async fetchById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  public async fetchByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  public async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...data,
        password: await hash(data.password, 10),
        dataRooms: {
          create: {
            name: `${data.name}'s Data Room`,
          },
        },
      },
    });
  }

  public async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data });
      if (typeof data.name === 'string') {
        await tx.dataRoom.updateMany({
          where: { ownerId: id },
          data: { name: `${data.name}'s Data Room` },
        });
      }
      return user;
    });
  }
}
