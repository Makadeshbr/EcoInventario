jest.mock('@/api/client', () => ({
  api: {
    post: jest.fn().mockReturnValue({
      json: jest.fn().mockResolvedValue({
        access_token: 'at-1',
        refresh_token: 'rt-1',
        expires_in: 3600,
        user: {
          id: 'u-1',
          name: 'Tech User',
          email: 'tech@eco.com',
          role: 'tech',
          organization_id: 'org-1',
        },
      }),
    }),
  },
}));

import { api } from '@/api/client';
import { login } from '../api';

describe('login()', () => {
  test('chama POST auth/login com as credenciais', async () => {
    await login({ email: 'tech@eco.com', password: 'senhasegura' });
    expect(api.post).toHaveBeenCalledWith('auth/login', {
      json: { email: 'tech@eco.com', password: 'senhasegura' },
    });
  });

  test('converte resposta de snake_case para camelCase', async () => {
    const result = await login({ email: 'tech@eco.com', password: 'senhasegura' });
    expect(result.accessToken).toBe('at-1');
    expect(result.refreshToken).toBe('rt-1');
    expect(result.expiresIn).toBe(3600);
    expect(result.user.organizationId).toBe('org-1');
  });

  test('propaga erro de rede', async () => {
    (api.post as jest.Mock).mockReturnValueOnce({
      json: jest.fn().mockRejectedValueOnce(new Error('Network error')),
    });
    await expect(login({ email: 'tech@eco.com', password: 'senhasegura' })).rejects.toThrow('Network error');
  });
});
