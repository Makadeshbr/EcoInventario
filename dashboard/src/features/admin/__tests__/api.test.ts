import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  createAssetType,
  createUser,
  listAssetTypesForAdmin,
  listUsers,
  updateAssetType,
  updateUser,
} from '../api';

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  apiFetch: apiFetchMock,
}));

beforeEach(() => {
  apiFetchMock.mockReset();
});

describe('admin api', () => {
  test('lista usuarios com filtros cursor-based', async () => {
    apiFetchMock.mockResolvedValueOnce({
      data: [],
      pagination: { next_cursor: null, has_more: false },
    });

    await listUsers('token', {
      role: 'tech',
      isActive: true,
      cursor: 'user-0',
      limit: 25,
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/users?role=tech&is_active=true&cursor=user-0&limit=25',
      { token: 'token' },
    );
  });

  test('cria usuario sem enviar organization_id pelo payload', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      role: 'admin',
      is_active: true,
      created_at: '2026-05-04T10:00:00Z',
    });

    await createUser('token', {
      name: 'Ana',
      email: 'ana@example.com',
      password: 'senhaSegura123',
      role: 'admin',
    });

    expect(apiFetchMock).toHaveBeenCalledWith('/users', {
      token: 'token',
      method: 'POST',
      body: {
        name: 'Ana',
        email: 'ana@example.com',
        password: 'senhaSegura123',
        role: 'admin',
      },
    });
  });

  test('atualiza role e ativo do usuario', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      role: 'viewer',
      is_active: false,
      created_at: '2026-05-04T10:00:00Z',
    });

    await updateUser('token', 'user-1', { role: 'viewer', isActive: false });

    expect(apiFetchMock).toHaveBeenCalledWith('/users/user-1', {
      token: 'token',
      method: 'PATCH',
      body: {
        role: 'viewer',
        is_active: false,
      },
    });
  });

  test('envia payload de criacao e toggle de tipos de asset', async () => {
    apiFetchMock
      .mockResolvedValueOnce({
        id: 'type-1',
        name: 'Nascente',
        description: 'Agua natural',
        is_active: true,
      })
      .mockResolvedValueOnce({
        id: 'type-1',
        name: 'Nascente',
        description: 'Agua natural',
        is_active: false,
      })
      .mockResolvedValueOnce({
        data: [{ id: 'type-1', name: 'Nascente', description: null, is_active: true }],
      });

    await createAssetType('token', { name: 'Nascente', description: 'Agua natural' });
    await updateAssetType('token', 'type-1', { isActive: false });
    await listAssetTypesForAdmin('token');

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, '/asset-types', {
      token: 'token',
      method: 'POST',
      body: { name: 'Nascente', description: 'Agua natural' },
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, '/asset-types/type-1', {
      token: 'token',
      method: 'PATCH',
      body: { is_active: false },
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, '/asset-types', { token: 'token' });
  });
});
