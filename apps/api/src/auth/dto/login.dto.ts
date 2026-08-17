import { PickType } from '@nestjs/mapped-types';
import { RegisterDto } from 'src/auth/dto/register.dto';

export class LoginDto extends PickType(RegisterDto, [
  'email',
  'password',
] as const) {}
