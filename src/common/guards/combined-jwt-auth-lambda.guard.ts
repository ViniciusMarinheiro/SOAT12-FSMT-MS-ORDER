import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { firstValueFrom, Observable } from 'rxjs';
import { ExtractJwt } from 'passport-jwt';
import * as jwt from 'jsonwebtoken';
import { ALLOW_LAMBDA_TOKEN_KEY } from '../decorators/allow-lambda-token.decorator';
import { EnvConfigService } from '../service/env/env-config.service';
import { LambdaJwtPayload } from '../interfaces/lambda-jwt-payload.interface';

@Injectable()
export class CombinedJwtAuthLambdaGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private envConfigService: EnvConfigService,
  ) {
    super();
  }

  private async resolveCanActivate(
    result: boolean | Promise<boolean> | Observable<boolean>,
  ): Promise<boolean> {
    if (typeof result === 'boolean') {
      return result;
    }
    if (result instanceof Promise) {
      return result;
    }
    return firstValueFrom(result);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowLambdaToken = this.reflector.getAllAndOverride<boolean>(
      ALLOW_LAMBDA_TOKEN_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (allowLambdaToken) {
      const request = context.switchToHttp().getRequest();
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

      if (!token) {
        throw new UnauthorizedException('Token inválido');
      }

      try {
        const payload = jwt.verify(
          token,
          this.envConfigService.get('LAMBDA_JWT_SECRET'),
        ) as unknown as LambdaJwtPayload;
        request.user = {
          sub: payload.sub,
          cpf: payload.cpf,
          nome: payload.nome,
          role: payload.role,
          source: 'lambda',
        };
        return true;
      } catch {
        throw new UnauthorizedException('Token inválido');
      }
    }

    try {
      const result = super.canActivate(context);
      const isAllowed = await this.resolveCanActivate(result);
      return isAllowed;
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }
}
