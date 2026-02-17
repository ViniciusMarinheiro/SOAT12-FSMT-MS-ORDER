import { Injectable, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { ALLOW_LAMBDA_TOKEN_KEY } from '../decorators'

@Injectable()
export class GlobalJwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super()
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const allowLambdaToken = this.reflector.getAllAndOverride<boolean>(
      ALLOW_LAMBDA_TOKEN_KEY,
      [context.getHandler(), context.getClass()],
    )
    console.log('allowLambdaToken', allowLambdaToken)
    if (allowLambdaToken) {
      return true
    }

    return super.canActivate(context)
  }
}
