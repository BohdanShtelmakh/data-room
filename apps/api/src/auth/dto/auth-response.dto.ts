import { UserResponseDto } from 'src/user/dto/user-response.dto';

export class AuthTokensResponseDto {
  accessToken: string;

  refreshToken: string;

  constructor(tokens: { accessToken: string; refreshToken: string }) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
  }
}

export class AuthResponseDto extends AuthTokensResponseDto {
  user: UserResponseDto;

  constructor(data: {
    accessToken: string;
    refreshToken: string;
    user: UserResponseDto;
  }) {
    super({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    this.user = data.user;
  }
}
