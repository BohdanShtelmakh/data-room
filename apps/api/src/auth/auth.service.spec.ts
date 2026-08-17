import { HttpException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserService } from '../user/user.service';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userService: {
    fetchByEmail: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    fetchById: jest.Mock;
  };
  let configService: { getOrThrow: jest.Mock };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };

  const baseUser: User = {
    id: 'user-id',
    email: 'user@example.com',
    password: 'hashed-password',
    name: 'John Doe',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    refreshToken: 'stored-refresh',
  };

  beforeEach(async () => {
    userService = {
      fetchByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      fetchById: jest.fn(),
    };
    configService = {
      getOrThrow: jest.fn(),
    };
    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const configValues: Record<string, string> = {
      JWT_ACCESS_TOKEN_SECRET: 'access-secret',
      JWT_ACCESS_TOKEN_EXPIRATION: '10m',
      JWT_REFRESH_TOKEN_SECRET: 'refresh-secret',
      JWT_REFRESH_TOKEN_EXPIRATION: '30d',
    };
    configService.getOrThrow.mockImplementation(
      (key: keyof typeof configValues) => configValues[key],
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: ConfigService, useValue: configService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('returns tokens and user data for valid credentials', async () => {
      userService.fetchByEmail.mockResolvedValue(baseUser);
      (compare as jest.Mock).mockResolvedValue(true);
      (hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      userService.update.mockResolvedValue({
        ...baseUser,
        refreshToken: 'hashed-refresh-token',
      });

      const dto: LoginDto = {
        email: baseUser.email,
        password: 'plain-password',
      };
      const result = await service.login(dto);

      expect(userService.fetchByEmail).toHaveBeenCalledWith(dto.email);
      expect(compare).toHaveBeenCalledWith(dto.password, baseUser.password);
      expect(hash).toHaveBeenCalledWith('refresh-token', 10);
      expect(userService.update).toHaveBeenCalledWith(baseUser.id, {
        refreshToken: 'hashed-refresh-token',
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(result).toBeInstanceOf(AuthResponseDto);
      expect(result).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: baseUser.id,
          email: baseUser.email,
          name: baseUser.name,
        },
      });
    });

    it('throws UnauthorizedException when password does not match', async () => {
      userService.fetchByEmail.mockResolvedValue(baseUser);
      (compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: baseUser.email,
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(userService.update).not.toHaveBeenCalled();
    });

    it('throws HttpException when user is not found', async () => {
      userService.fetchByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'missing@example.com',
          password: 'any',
        }),
      ).rejects.toBeInstanceOf(HttpException);
      expect(compare).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('creates a new user and returns tokens', async () => {
      userService.fetchByEmail.mockResolvedValue(null);
      userService.create.mockResolvedValue(baseUser);
      userService.update.mockResolvedValue({
        ...baseUser,
        refreshToken: 'hashed-refresh-token',
      });
      (hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const dto: RegisterDto = {
        email: baseUser.email,
        password: 'plain-password',
        name: baseUser.name ?? undefined,
      };

      const result = await service.register(dto);

      expect(userService.fetchByEmail).toHaveBeenCalledWith(dto.email);
      expect(userService.create).toHaveBeenCalledWith(dto);
      expect(userService.update).toHaveBeenCalledWith(baseUser.id, {
        refreshToken: 'hashed-refresh-token',
      });
      expect(result).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: baseUser.id,
          email: baseUser.email,
          name: baseUser.name,
        },
      });
    });

    it('throws when user already exists', async () => {
      userService.fetchByEmail.mockResolvedValue(baseUser);

      await expect(
        service.register({
          email: baseUser.email,
          password: 'test',
          name: baseUser.name,
        }),
      ).rejects.toBeInstanceOf(HttpException);
      expect(userService.create).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('issues new tokens when refresh token is valid', async () => {
      jwtService.verify.mockReturnValue({ userId: baseUser.id });
      userService.fetchById.mockResolvedValue(baseUser);
      (compare as jest.Mock).mockResolvedValue(true);
      (hash as jest.Mock).mockResolvedValue('new-hashed-refresh');
      userService.update.mockResolvedValue({
        ...baseUser,
        refreshToken: 'new-hashed-refresh',
      });
      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await service.refreshToken('valid-refresh');

      expect(jwtService.verify).toHaveBeenCalledWith('valid-refresh', {
        secret: 'refresh-secret',
      });
      expect(userService.fetchById).toHaveBeenCalledWith(baseUser.id);
      expect(compare).toHaveBeenCalledWith(
        'valid-refresh',
        baseUser.refreshToken,
      );
      expect(hash).toHaveBeenCalledWith('new-refresh-token', 10);
      expect(userService.update).toHaveBeenCalledWith(baseUser.id, {
        refreshToken: 'new-hashed-refresh',
      });
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('throws UnauthorizedException when refresh token is invalid', async () => {
      jwtService.verify.mockReturnValue({ userId: baseUser.id });
      userService.fetchById.mockResolvedValue(baseUser);
      (compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshToken('invalid')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(userService.update).not.toHaveBeenCalled();
    });
  });

  it('clears refresh token on logout', async () => {
    userService.update.mockResolvedValue({ ...baseUser, refreshToken: null });

    await service.logout(baseUser.id);

    expect(userService.update).toHaveBeenCalledWith(baseUser.id, {
      refreshToken: null,
    });
  });
});
