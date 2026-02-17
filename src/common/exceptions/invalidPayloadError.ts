import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidPayloadError extends HttpException {
  constructor(message: string) {
    super(
      {
        status: HttpStatus.BAD_REQUEST,
        message,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
