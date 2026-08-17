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
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(5432),
        DB_NAME: Joi.string().required(),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        APP_PORT: Joi.number().default(3000),
        JWT_ACCESS_TOKEN_SECRET: Joi.string().required(),
        JWT_ACCESS_TOKEN_EXPIRATION: Joi.string().default('1m').required(),
        JWT_REFRESH_TOKEN_SECRET: Joi.string().required(),
        JWT_REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d').required(),
        DATABASE_URL: Joi.string().uri().required(),
        CORS_ORIGIN: Joi.string().optional(),
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
