/**
 * Testes da camada de API pública.
 *
 * Estratégia: mockamos ky.create() com referências internas à factory
 * para contornar o hoisting do jest.mock e verificar endpoints/params corretamente.
 */

jest.mock('@/constants/config', () => ({
  API_BASE_URL: 'http://localhost:8080/api/v1',
}));

// As funções de mock são criadas DENTRO da factory para evitar problemas de hoisting.
// Acessamos via jest.requireMock() após os imports.
jest.mock('ky', () => {
  const _json = jest.fn();
  const _get = jest.fn(() => ({ json: _json }));
  return {
    __esModule: true,
    default: { create: jest.fn(() => ({ get: _get })) },
    // Exporta os mocks para acesso nos testes
    _json,
    _get,
  };
});

import { getPublicAssetTypes, getPublicAssets, getPublicAsset, resolveQRCode } from '../api';

// Acessa os mocks criados dentro da factory
const kyMock = jest.requireMock('ky') as { _json: jest.Mock; _get: jest.Mock };
const mockJson = kyMock._json;
const mockGet = kyMock._get;

beforeEach(() => {
  jest.clearAllMocks();
  // mockGet por padrão retorna { json: mockJson } (já vem da factory)
  mockGet.mockReturnValue({ json: mockJson });
});

describe('getPublicAssetTypes', () => {
  it('chama o endpoint public/asset-types', async () => {
    mockJson.mockResolvedValue({ data: [] });

    await getPublicAssetTypes();

    expect(mockGet).toHaveBeenCalledWith('public/asset-types');
  });

  it('retorna o array data da response', async () => {
    const mockTypes = [{ id: '1', name: 'Árvore' }, { id: '2', name: 'Nascente' }];
    mockJson.mockResolvedValue({ data: mockTypes });

    const result = await getPublicAssetTypes();

    expect(result).toEqual(mockTypes);
  });
});

describe('getPublicAssets', () => {
  it('chama public/assets com bounds nos searchParams', async () => {
    mockJson.mockResolvedValue({ data: [] });
    const bounds = '-23.5,-46.6,-23.4,-46.5';

    await getPublicAssets(bounds);

    expect(mockGet).toHaveBeenCalledWith('public/assets', {
      searchParams: { bounds },
    });
  });

  it('inclui type_id quando typeId é fornecido', async () => {
    mockJson.mockResolvedValue({ data: [] });

    await getPublicAssets('-23.5,-46.6,-23.4,-46.5', 'type-abc');

    expect(mockGet).toHaveBeenCalledWith('public/assets', {
      searchParams: { bounds: '-23.5,-46.6,-23.4,-46.5', type_id: 'type-abc' },
    });
  });

  it('não inclui type_id quando typeId é undefined', async () => {
    mockJson.mockResolvedValue({ data: [] });

    await getPublicAssets('-23.5,-46.6,-23.4,-46.5');

    const [, opts] = mockGet.mock.calls[0] as [string, { searchParams: Record<string, string> }];
    expect(opts.searchParams).not.toHaveProperty('type_id');
  });

  it('retorna o array data', async () => {
    const mockAssets = [{ id: 'a1', latitude: -23.5, longitude: -46.6 }];
    mockJson.mockResolvedValue({ data: mockAssets });

    const result = await getPublicAssets('-23.5,-46.6,-23.4,-46.5');

    expect(result).toEqual(mockAssets);
  });
});

describe('getPublicAsset', () => {
  it('chama o endpoint public/assets/{id}', async () => {
    mockJson.mockResolvedValue({ id: 'a1' });

    await getPublicAsset('a1');

    expect(mockGet).toHaveBeenCalledWith('public/assets/a1');
  });

  it('retorna o detalhe do asset', async () => {
    const detail = { id: 'a1', asset_type: { id: '1', name: 'Árvore' }, manejos: [], monitoramentos: [] };
    mockJson.mockResolvedValue(detail);

    const result = await getPublicAsset('a1');

    expect(result).toEqual(detail);
  });
});

describe('resolveQRCode', () => {
  it('chama resolve-qr com code nos searchParams', async () => {
    mockJson.mockResolvedValue({ asset_id: 'a1', is_available: true });
    const code = 'https://app.ecoinventario.com/a/xyz';

    await resolveQRCode(code);

    expect(mockGet).toHaveBeenCalledWith('public/assets/resolve-qr', {
      searchParams: { code },
    });
  });

  it('retorna is_available true para asset aprovado', async () => {
    mockJson.mockResolvedValue({ asset_id: 'a1', is_available: true });

    const result = await resolveQRCode('https://app.ecoinventario.com/a/xyz');

    expect(result.is_available).toBe(true);
    expect(result.asset_id).toBe('a1');
  });

  it('retorna is_available false quando não disponível', async () => {
    mockJson.mockResolvedValue({ asset_id: null, is_available: false });

    const result = await resolveQRCode('https://app.ecoinventario.com/a/nope');

    expect(result.is_available).toBe(false);
    expect(result.asset_id).toBeNull();
  });
});
