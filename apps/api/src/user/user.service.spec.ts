import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, User } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './user.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  let prisma: {
    user: {
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('hashes the password before creating the user', async () => {
    const hashMock = hash as unknown as jest.Mock<
      Promise<string>,
      [string, number]
    >;
    hashMock.mockResolvedValue('hashedPassword');

    const input: Prisma.UserCreateInput = {
      email: 'test@example.com',
      password: 'plainPassword',
      name: 'Test User',
    };

    const user: User = {
      id: '',
      email: input.email,
      password: 'hashedPassword',
      name: input.name,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      refreshToken: null,
    };

    prisma.user.create.mockResolvedValue(user);

    const result = await service.create(input);

    expect(hashMock).toHaveBeenCalledWith('plainPassword', 10);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(user);
  });
});
