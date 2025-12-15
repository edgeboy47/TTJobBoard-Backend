import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) { }

  use(req: Request, res: Response, next: NextFunction) {
    const apiKeyHeader = 'x-api-key'
    const reqKey = req.headers?.[apiKeyHeader]
    const apiKey = this.configService.get<string>('API_KEY')
    if (!reqKey || reqKey !== apiKey) {
      throw new UnauthorizedException('Invalid API Key')
    }
    next();
  }
}
