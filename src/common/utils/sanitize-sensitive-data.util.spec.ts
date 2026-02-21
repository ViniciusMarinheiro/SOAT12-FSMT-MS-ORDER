import { sanitizeSensitiveData } from './sanitize-sensitive-data.util';

describe('sanitizeSensitiveData', () => {
  it('should return null if data is null', () => {
    expect(sanitizeSensitiveData(null)).toBeNull();
  });

  it('should return undefined if data is undefined', () => {
    expect(sanitizeSensitiveData(undefined)).toBeUndefined();
  });

  it('should return non-object values as is', () => {
    expect(sanitizeSensitiveData('string')).toBe('string');
    expect(sanitizeSensitiveData(123)).toBe(123);
    expect(sanitizeSensitiveData(true)).toBe(true);
  });

  it('should mask password field', () => {
    const data = { password: 'secret123' };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;

    expect(result.password).toBe('********');
  });

  it('should mask senha field', () => {
    const data = { senha: 'secret123' };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;

    expect(result.senha).toBe('********');
  });

  it('should mask CPF', () => {
    const data = { cpf: '12345678901' };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;

    expect(result.cpf).toMatch(/123\.\*\*\*\.\*\*\*-01/);
  });

  it('should mask CNPJ', () => {
    const data = { cnpj: '12345678000190' };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;

    expect(result.cnpj).toMatch(/12\.345\.\*\*\*\/\d{4}-\d{2}/);
  });

  it('should mask email', () => {
    const data = { email: 'test@example.com' };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;

    expect(result.email).toMatch(/te\*\*@example\.com/);
  });

  it('should mask phone', () => {
    const data = { phone: '11987654321' };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;

    expect(result.phone).toMatch(/\(11\) \*\*\*\*\*-21/);
  });

  it('should mask telefone', () => {
    const data = { telefone: '11987654321' };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;

    expect(result.telefone).toMatch(/\(11\) \*\*\*\*\*-21/);
  });

  it('should mask token', () => {
    const data = { token: 'abc123xyz' };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;

    expect(result.token).toBe('********');
  });

  it('should mask access_token', () => {
    const data = { access_token: 'abc123xyz' };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;

    expect(result.access_token).toBe('********');
  });

  it('should mask document field', () => {
    const data = { document: '12345678901' };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;

    expect(result.document).toMatch(/123\.\*\*\*\.\*\*\*-01/);
  });

  it('should keep non-sensitive fields unchanged', () => {
    const data = { name: 'John Doe', age: 30 };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;

    expect(result.name).toBe('John Doe');
    expect(result.age).toBe(30);
  });

  it('should sanitize nested objects', () => {
    const data = {
      user: {
        name: 'John',
        email: 'john@example.com',
        password: 'secret',
      },
    };
    const result = sanitizeSensitiveData(data) as {
      user: Record<string, unknown>;
    };

    expect(result.user.name).toBe('John');
    expect(result.user.email).toMatch(/jo\*\*@example\.com/);
    expect(result.user.password).toBe('********');
  });

  it('should sanitize arrays', () => {
    const data = [
      { name: 'User1', email: 'user1@example.com' },
      { name: 'User2', password: 'secret' },
    ];
    const result = sanitizeSensitiveData(data) as Record<string, unknown>[];

    expect(result[0].email).toMatch(/us\*\*\*@example\.com/);
    expect(result[1].password).toBe('********');
  });

  it('should handle mixed case field names', () => {
    const data = { Password: 'secret', EMAIL: 'test@example.com' };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;

    expect(result.Password).toBe('********');
    expect(result.EMAIL).toMatch(/te\*\*@example\.com/);
  });

  it('should mask document with length not 11 or 14 (fallback to maskString)', () => {
    const data = { document: '12345' };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;
    expect(result.document).toBe('12*45');
  });

  it('should mask very short document (length <= 4) with asterisks only', () => {
    const data = { document: '12' };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;
    expect(result.document).toBe('**');
  });

  it('should mask email without @ (fallback to maskString)', () => {
    const data = { email: 'invalidemail' };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;
    expect(result.email).toBe('in********il');
  });

  it('should mask short phone (< 10 digits) with maskString', () => {
    const data = { phone: '123' };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;
    expect(result.phone).toMatch(/^\*+$/);
  });

  it('should mask field name containing "key" (api_key)', () => {
    const data = { api_key: 'secret-key-value' };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;
    expect(result.api_key).toBe('********');
  });

  it('should return non-string sensitive value as-is (no mask)', () => {
    const data = { password: 12345 };
    const result = sanitizeSensitiveData(data) as Record<string, unknown>;
    expect(result.password).toBe(12345);
  });

  it('should recursively sanitize nested object in non-sensitive key', () => {
    const data = { meta: { password: 'secret' } };
    const result = sanitizeSensitiveData(data) as {
      meta: Record<string, unknown>;
    };
    expect(result.meta.password).toBe('********');
  });
});
