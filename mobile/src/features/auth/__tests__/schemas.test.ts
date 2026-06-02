import { loginSchema } from '../schemas';

describe('loginSchema', () => {
  test('aceita email e senha validos', () => {
    expect(loginSchema.safeParse({ email: 'tech@eco.com', password: '12345678' }).success).toBe(true);
  });

  test('normaliza email antes de enviar login', () => {
    const result = loginSchema.safeParse({ email: '  TECH@ECO.COM  ', password: '12345678' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('tech@eco.com');
  });

  test('rejeita email sem @', () => {
    const r = loginSchema.safeParse({ email: 'nao-email', password: '12345678' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.email).toBeDefined();
  });

  test('rejeita email vazio', () => {
    expect(loginSchema.safeParse({ email: '', password: '12345678' }).success).toBe(false);
  });

  test('rejeita senha com menos de 8 caracteres', () => {
    const r = loginSchema.safeParse({ email: 'tech@eco.com', password: '1234567' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.password).toBeDefined();
  });

  test('rejeita senha vazia', () => {
    expect(loginSchema.safeParse({ email: 'tech@eco.com', password: '' }).success).toBe(false);
  });

  test('aceita senha com exatamente 8 caracteres', () => {
    expect(loginSchema.safeParse({ email: 'tech@eco.com', password: '12345678' }).success).toBe(true);
  });
});
