import {
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import {
  AuthResponseDto,
  AuthTokensResponseDto,
} from 'src/auth/dto/auth-response.dto';
import { LoginDto } from 'src/auth/dto/login.dto';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { UserResponseDto } from 'src/user/dto/user-response.dto';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenPayload = { userId: user.id };

    const accessToken = this.jwtService.sign(tokenPayload, {
      secret: this.configService.getOrThrow('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn: this.configService.getOrThrow('JWT_ACCESS_TOKEN_EXPIRATION'),
    });

    const refreshToken = this.jwtService.sign(tokenPayload, {
      secret: this.configService.getOrThrow('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.getOrThrow('JWT_REFRESH_TOKEN_EXPIRATION'),
    });

    await this.userService.update(user.id, {
      refreshToken: await hash(refreshToken, 10),
    });

    return { accessToken, refreshToken };
  }

  public async login(data: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userService.fetchByEmail(data.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const passwordMatches = await compare(data.password, user.password);
    if (!passwordMatches)
      throw new UnauthorizedException('Invalid credentials');

    const { accessToken, refreshToken } = await this.generateTokens(user);

    const safeUser = UserResponseDto.fromEntity(user);

    return new AuthResponseDto({
      accessToken,
      refreshToken,
      user: safeUser,
    });
  }

  public async refreshToken(
    refreshToken: string,
  ): Promise<AuthTokensResponseDto> {
    try {
      const decodedToken = this.jwtService.verify<{ userId: string }>(
        refreshToken,
        { secret: this.configService.getOrThrow('JWT_REFRESH_TOKEN_SECRET') },
      );

      const user = await this.userService.fetchById(decodedToken.userId);
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException();
      }
      const refreshTokenMatches = await compare(
        refreshToken,
        user.refreshToken,
      );
      if (!refreshTokenMatches) {
        throw new UnauthorizedException();
      }

      const { accessToken, refreshToken: newRefreshToken } =
        await this.generateTokens(user);

      return new AuthTokensResponseDto({
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch {
      throw new UnauthorizedException('Refresh token is not valid');
    }
  }

  public async logout(userId: string): Promise<void> {
    await this.userService.update(userId, { refreshToken: null });
  }

  public async register(data: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.userService.fetchByEmail(data.email);
    if (existingUser) {
      throw new HttpException('User already exists', 409);
    }

    const user = await this.userService.create(data);
    const { accessToken, refreshToken } = await this.generateTokens(user);
    return new AuthResponseDto({
      accessToken,
      refreshToken,
      user: UserResponseDto.fromEntity(user),
    });
  }
}
