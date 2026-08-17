import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { Request } from 'src/types/request_user';

export const Auth = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
