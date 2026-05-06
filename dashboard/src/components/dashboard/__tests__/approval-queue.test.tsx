import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { ApprovalQueue } from '../approval-queue';

const item = {
  entityType: 'asset' as const,
  id: 'asset-1',
  title: 'Arvore',
  owner: 'Tecnico',
  createdAt: '2026-05-03T10:00:00Z',
  data: {
    id: 'asset-1',
    assetType: { id: 'type-1', name: 'Arvore' },
    latitude: -23.5,
    longitude: -46.6,
    gpsAccuracyM: null,
    qrCode: 'QR-1',
    status: 'pending' as const,
    version: 1,
    parentId: null,
    rejectionReason: null,
    notes: 'Nota',
    createdBy: { id: 'user-1', name: 'Tecnico' },
    approvedBy: null,
    distanceM: null,
    createdAt: '2026-05-03T10:00:00Z',
    updatedAt: '2026-05-03T10:00:00Z',
  },
};

describe('ApprovalQueue', () => {
  test('rejeitar exige motivo antes de chamar API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<ApprovalQueue initialItems={[item]} />);

    fireEvent.click(screen.getByRole('button', { name: /rejeitar/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar rejeicao/i }));

    expect(await screen.findByText(/informe o motivo/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
