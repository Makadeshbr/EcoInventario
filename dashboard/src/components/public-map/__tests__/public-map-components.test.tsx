import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { PublicAssetDetails } from '../public-asset-details';

vi.mock('../public-assets-map', () => ({
  PublicAssetsMap: () => <div data-testid="public-assets-map" />,
}));

describe('PublicAssetDetails', () => {
  test('renderiza ficha publica sem campos internos', () => {
    render(
      <PublicAssetDetails
        asset={{
          id: 'asset-1',
          assetType: { id: 'type-1', name: 'Arvore' },
          latitude: -23.5,
          longitude: -46.6,
          qrCode: 'qr-1',
          organizationName: 'Secretaria Verde',
          media: [{ id: 'media-1', type: 'general', url: 'https://example.com/photo.jpg' }],
          manejos: [
            {
              id: 'manejo-1',
              description: 'Poda de formacao',
              beforeMediaUrl: null,
              afterMediaUrl: null,
              createdAt: '2026-05-04T10:00:00Z',
            },
          ],
          monitoramentos: [
            {
              id: 'mon-1',
              notes: 'Copa densa',
              healthStatus: 'healthy',
              createdAt: '2026-05-04T10:00:00Z',
            },
          ],
          createdAt: '2026-05-04T10:00:00Z',
        }}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Arvore' })).toBeInTheDocument();
    expect(screen.getByText('Secretaria Verde')).toBeInTheDocument();
    expect(screen.getByText('Poda de formacao')).toBeInTheDocument();
    expect(screen.getByText('Copa densa')).toBeInTheDocument();
    expect(screen.queryByText(/created_by/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/rejection/i)).not.toBeInTheDocument();
  });
});
