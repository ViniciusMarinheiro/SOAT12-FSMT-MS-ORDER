import { SetMetadata } from '@nestjs/common'

export const ALLOW_LAMBDA_TOKEN_KEY = 'allowLambdaToken'
export const AllowLambdaToken = () => SetMetadata(ALLOW_LAMBDA_TOKEN_KEY, true)
