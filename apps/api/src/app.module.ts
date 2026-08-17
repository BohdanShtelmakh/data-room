import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { DataRoomModule } from './data-room/data-room.module';
import { FolderModule } from './folder/folder.module';
import { PrismaService } from './prisma/prisma.service';
import { UserModule } from './user/user.module';
import { FileModule } from './file/file.module';
import { ShareModule } from './share/share.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      validationSchema: Joi.object({
        APP_PORT: Joi.number().default(3000),
        PORT: Joi.number().optional(),
        JWT_ACCESS_TOKEN_SECRET: Joi.string().required(),
        JWT_ACCESS_TOKEN_EXPIRATION: Joi.string().default('1m').required(),
        JWT_REFRESH_TOKEN_SECRET: Joi.string().required(),
        JWT_REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d').required(),
        DATABASE_URL: Joi.string().uri().required(),
        CORS_ORIGIN: Joi.string().optional(),
        STORAGE_DRIVER: Joi.string()
          .valid('local', 'supabase')
          .default('local'),
        LOCAL_STORAGE_PATH: Joi.string().default('./uploads'),
        SUPABASE_URL: Joi.when('STORAGE_DRIVER', {
          is: 'supabase',
          then: Joi.string().uri().required(),
          otherwise: Joi.string().optional(),
        }),
        SUPABASE_SECRET_KEY: Joi.when('STORAGE_DRIVER', {
          is: 'supabase',
          then: Joi.string().required(),
          otherwise: Joi.string().optional(),
        }),
        SUPABASE_STORAGE_BUCKET: Joi.when('STORAGE_DRIVER', {
          is: 'supabase',
          then: Joi.string().required(),
          otherwise: Joi.string().optional(),
        }),
      }),
      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
      },
    }),
    AuthModule,
    UserModule,
    DataRoomModule,
    FolderModule,
    FileModule,
    ShareModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
