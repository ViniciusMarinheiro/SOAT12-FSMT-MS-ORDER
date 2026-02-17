import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { LambdaJwtPayload } from '../interfaces/lambda-jwt-payload.interface'

export const CurrentUserLambda = createParamDecorator(
  (_: undefined, context: ExecutionContext): LambdaJwtPayload => {
    const request = context.switchToHttp().getRequest()
    return request.user as LambdaJwtPayload
  },
)
