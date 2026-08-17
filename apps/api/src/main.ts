import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { HttpExceptionFilter } from 'src/http-exception/http-exception.filter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((origin) => origin.trim())
      : false,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalGuards(new JwtAuthGuard(app.get(Reflector)));
  const port = process.env.APP_PORT ?? 3000;
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
  Logger.log(`Application is running on: ${port}`, 'App');
}
void bootstrap();
