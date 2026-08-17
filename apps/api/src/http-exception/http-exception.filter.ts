import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter<T> implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else {
        if (Array.isArray(res['message'])) {
          message = res['message'].join(', ');
        } else if (typeof res['message'] === 'string') {
          message = res['message'];
        } else {
          message = 'An error occurred';
        }
      }
      response.status(status).json({
        success: false,
        message,
      });
    } else {
      response.status(status).json({
        success: false,
        message: 'An unexpected error occurred',
      });
    }
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      Logger.error(
        'Unexpected request failure',
        exception instanceof Error ? exception.stack : undefined,
        HttpExceptionFilter.name,
      );
    }
  }
}
