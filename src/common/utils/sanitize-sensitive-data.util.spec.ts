import { sanitizeSensitiveData } from './sanitize-sensitive-data.util'

describe('sanitizeSensitiveData', () => {
  it('should return null if data is null', () => {
    expect(sanitizeSensitiveData(null)).toBeNull()
  })

  it('should return undefined if data is undefined', () => {
    expect(sanitizeSensitiveData(undefined)).toBeUndefined()
  })

  it('should return non-object values as is', () => {
    expect(sanitizeSensitiveData('string')).toBe('string')
    expect(sanitizeSensitiveData(123)).toBe(123)
    expect(sanitizeSensitiveData(true)).toBe(true)
  })

  it('should mask password field', () => {
    const data = { password: 'secret123' }
    const result = sanitizeSensitiveData(data)

    expect(result.password).toBe('********')
  })

  it('should mask senha field', () => {
    const data = { senha: 'secret123' }
    const result = sanitizeSensitiveData(data)

    expect(result.senha).toBe('********')
  })

  it('should mask CPF', () => {
    const data = { cpf: '12345678901' }
    const result = sanitizeSensitiveData(data)

    expect(result.cpf).toMatch(/123\.\*\*\*\.\*\*\*-01/)
  })

  it('should mask CNPJ', () => {
    const data = { cnpj: '12345678000190' }
    const result = sanitizeSensitiveData(data)

    expect(result.cnpj).toMatch(/12\.345\.\*\*\*\/\d{4}-\d{2}/)
  })

  it('should mask email', () => {
    const data = { email: 'test@example.com' }
    const result = sanitizeSensitiveData(data)

    expect(result.email).toMatch(/te\*\*@example\.com/)
  })

  it('should mask phone', () => {
    const data = { phone: '11987654321' }
    const result = sanitizeSensitiveData(data)

    expect(result.phone).toMatch(/\(11\) \*\*\*\*\*-21/)
  })

  it('should mask telefone', () => {
    const data = { telefone: '11987654321' }
    const result = sanitizeSensitiveData(data)

    expect(result.telefone).toMatch(/\(11\) \*\*\*\*\*-21/)
  })

  it('should mask token', () => {
    const data = { token: 'abc123xyz' }
    const result = sanitizeSensitiveData(data)

    expect(result.token).toBe('********')
  })

  it('should mask access_token', () => {
    const data = { access_token: 'abc123xyz' }
    const result = sanitizeSensitiveData(data)

    expect(result.access_token).toBe('********')
  })

  it('should mask document field', () => {
    const data = { document: '12345678901' }
    const result = sanitizeSensitiveData(data)

    expect(result.document).toMatch(/123\.\*\*\*\.\*\*\*-01/)
  })

  it('should keep non-sensitive fields unchanged', () => {
    const data = { name: 'John Doe', age: 30 }
    const result = sanitizeSensitiveData(data)

    expect(result.name).toBe('John Doe')
    expect(result.age).toBe(30)
  })

  it('should sanitize nested objects', () => {
    const data = {
      user: {
        name: 'John',
        email: 'john@example.com',
        password: 'secret',
      },
    }
    const result = sanitizeSensitiveData(data)

    expect(result.user.name).toBe('John')
    expect(result.user.email).toMatch(/jo\*\*@example\.com/)
    expect(result.user.password).toBe('********')
  })

  it('should sanitize arrays', () => {
    const data = [
      { name: 'User1', email: 'user1@example.com' },
      { name: 'User2', password: 'secret' },
    ]
    const result = sanitizeSensitiveData(data)

    expect(result[0].email).toMatch(/us\*\*\*@example\.com/)
    expect(result[1].password).toBe('********')
  })

  it('should handle mixed case field names', () => {
    const data = { Password: 'secret', EMAIL: 'test@example.com' }
    const result = sanitizeSensitiveData(data)

    expect(result.Password).toBe('********')
    expect(result.EMAIL).toMatch(/te\*\*@example\.com/)
  })
})
