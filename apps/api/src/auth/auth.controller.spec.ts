import { Test, TestingModule } from '@nestjs/testing';
import {  User } from '@prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthTokensResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../user/dto/user-response.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    login: jest.Mock;
    register: jest.Mock;
    refreshToken: jest.Mock;
    logout: jest.Mock;
  };

  const userEntity: User = {
    id: 'user-id',
    email: 'user@example.com',
    password: 'hashed',
    name: 'John Doe',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    refreshToken: null,
  };

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('delegates login to the auth service', async () => {
    const response = new AuthResponseDto({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: UserResponseDto.fromEntity(userEntity),
    });
    authService.login.mockResolvedValue(response);

    const result = await controller.login({
      email: userEntity.email,
      password: 'plain',
    });

    expect(authService.login).toHaveBeenCalledWith({
      email: userEntity.email,
      password: 'plain',
    });
    expect(result).toBe(response);
  });

  it('delegates register to the auth service', async () => {
    const response = new AuthResponseDto({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: UserResponseDto.fromEntity(userEntity),
    });
    authService.register.mockResolvedValue(response);

    const dto = {
      email: userEntity.email,
      password: 'secret',
      name: userEntity.name,
    };
    const result = await controller.register(dto);

    expect(authService.register).toHaveBeenCalledWith(dto);
    expect(result).toBe(response);
  });

  it('delegates refreshToken to the auth service', async () => {
    const tokens = new AuthTokensResponseDto({
      accessToken: 'next-access',
      refreshToken: 'next-refresh',
    });
    authService.refreshToken.mockResolvedValue(tokens);

    const result = await controller.refreshToken({ refreshToken: 'token' });

    expect(authService.refreshToken).toHaveBeenCalledWith('token');
    expect(result).toBe(tokens);
  });

  it('returns profile using the DTO mapper', () => {
    const result = controller.getProfile(userEntity);

    expect(result).toEqual(UserResponseDto.fromEntity(userEntity));
  });

  it('calls logout on the service and returns confirmation message', async () => {
    const response = await controller.logout(userEntity);

    expect(authService.logout).toHaveBeenCalledWith(userEntity.id);
    expect(response).toEqual({ message: 'Logged out successfully' });
  });
});
