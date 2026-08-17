import { Body, Controller, Get, Post } from '@nestjs/common';
import type { User } from '@prisma/client';
import {
  AuthResponseDto,
  AuthTokensResponseDto,
} from 'src/auth/dto/auth-response.dto';
import { LoginDto } from 'src/auth/dto/login.dto';
import { RefreshTokenDto } from 'src/auth/dto/refresh-token.dto';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { Public } from 'src/decorators/public.decorator';
import { Auth } from 'src/decorators/user.decorator';
import { UserResponseDto } from 'src/user/dto/user-response.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  public async login(@Body() data: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(data);
  }

  @Post('register')
  @Public()
  public async register(@Body() data: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(data);
  }

  @Post('refresh')
  @Public()
  public async refreshToken(
    @Body() data: RefreshTokenDto,
  ): Promise<AuthTokensResponseDto> {
    return this.authService.refreshToken(data.refreshToken);
  }

  @Get('profile')
  public getProfile(@Auth() user: User): UserResponseDto {
    return UserResponseDto.fromEntity(user);
  }

  @Post('logout')
  public async logout(@Auth() user: User) {
    await this.authService.logout(user.id);
    return { message: 'Logged out successfully' };
  }
}
