export interface LambdaJwtPayload {
  sub: number
  cpf: string
  nome: string
  role: string
  source: 'lambda'
}
