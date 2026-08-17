import { User } from '@prisma/client';
import { Request as ExpressRequest } from 'express';

export type Request = ExpressRequest & { user: User | undefined };
