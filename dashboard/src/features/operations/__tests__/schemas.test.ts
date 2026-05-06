import { describe, expect, test } from 'vitest';

import { manejoSchema, monitoramentoSchema } from '../schemas';

describe('operation schemas', () => {
  test('normaliza manejo pending', () => {
    const result = manejoSchema.parse({
      id: 'm-1',
      asset_id: 'asset-1',
      description: 'Poda',
      status: 'pending',
      created_by: { id: 'user-1', name: 'Tecnico' },
      created_at: '2026-05-03T10:00:00Z',
      updated_at: '2026-05-03T10:00:00Z',
    });

    expect(result.assetId).toBe('asset-1');
    expect(result.createdBy.name).toBe('Tecnico');
  });

  test('normaliza monitoramento com health status', () => {
    const result = monitoramentoSchema.parse({
      id: 'mon-1',
      asset_id: 'asset-1',
      notes: 'Folhas saudáveis',
      health_status: 'healthy',
      status: 'approved',
      created_by: { id: 'user-1', name: 'Tecnico' },
      created_at: '2026-05-03T10:00:00Z',
      updated_at: '2026-05-03T10:00:00Z',
    });

    expect(result.healthStatus).toBe('healthy');
  });
});
