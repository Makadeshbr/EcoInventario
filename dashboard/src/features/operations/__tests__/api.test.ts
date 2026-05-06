import { describe, expect, test, vi } from 'vitest';

import { listManejos, listMonitoramentos } from '../api';

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  apiFetch: apiFetchMock,
}));

const pagination = {
  next_cursor: null,
  has_more: false,
};

describe('operations api', () => {
  test('envia filtros completos para manejos', async () => {
    apiFetchMock.mockResolvedValueOnce({ data: [], pagination });

    await listManejos('token', {
      status: 'pending',
      assetId: 'asset-1',
      createdBy: 'user-1',
      date: '2026-05-03',
      cursor: 'm-0',
      limit: 25,
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/manejos?status=pending&asset_id=asset-1&created_by=user-1&date=2026-05-03&cursor=m-0&limit=25',
      { token: 'token' },
    );
  });

  test('envia filtros de health para monitoramentos', async () => {
    apiFetchMock.mockResolvedValueOnce({ data: [], pagination });

    await listMonitoramentos('token', {
      status: 'approved',
      healthStatus: 'warning',
      assetId: 'asset-2',
      createdBy: 'user-2',
      date: '2026-05-04',
      limit: 10,
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/monitoramentos?status=approved&asset_id=asset-2&created_by=user-2&date=2026-05-04&health_status=warning&limit=10',
      { token: 'token' },
    );
  });
});
