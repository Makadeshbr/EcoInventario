import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  usePublicAssetTypes,
  usePublicAssets,
  usePublicAsset,
  useResolveQR,
} from '../queries';

jest.mock('../api', () => ({
  getPublicAssetTypes: jest.fn(),
  getPublicAssets: jest.fn(),
  getPublicAsset: jest.fn(),
  resolveQRCode: jest.fn(),
}));

import {
  getPublicAssetTypes,
  getPublicAssets,
  getPublicAsset,
  resolveQRCode,
} from '../api';

const mockedGetAssetTypes = getPublicAssetTypes as jest.MockedFunction<typeof getPublicAssetTypes>;
const mockedGetAssets = getPublicAssets as jest.MockedFunction<typeof getPublicAssets>;
const mockedGetAsset = getPublicAsset as jest.MockedFunction<typeof getPublicAsset>;
const mockedResolveQR = resolveQRCode as jest.MockedFunction<typeof resolveQRCode>;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => jest.clearAllMocks());

describe('usePublicAssetTypes', () => {
  it('busca e retorna os tipos de asset', async () => {
    const mockTypes = [{ id: '1', name: 'Árvore' }];
    mockedGetAssetTypes.mockResolvedValue(mockTypes);

    const { result } = renderHook(() => usePublicAssetTypes(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTypes);
  });

  it('chama getPublicAssetTypes exatamente uma vez', async () => {
    mockedGetAssetTypes.mockResolvedValue([]);

    const { result } = renderHook(() => usePublicAssetTypes(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedGetAssetTypes).toHaveBeenCalledTimes(1);
  });
});

describe('usePublicAssets', () => {
  it('fica desabilitado quando bounds é null', () => {
    const { result } = renderHook(() => usePublicAssets(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedGetAssets).not.toHaveBeenCalled();
  });

  it('fica desabilitado quando bounds é string vazia', () => {
    const { result } = renderHook(() => usePublicAssets(''), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('busca assets quando bounds é fornecido', async () => {
    const mockAssets = [{ id: 'a1' }];
    mockedGetAssets.mockResolvedValue(mockAssets as any);

    const { result } = renderHook(
      () => usePublicAssets('-23.5,-46.6,-23.4,-46.5'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockAssets);
  });

  it('passa bounds e typeId para getPublicAssets', async () => {
    mockedGetAssets.mockResolvedValue([]);
    const bounds = '-23.5,-46.6,-23.4,-46.5';

    const { result } = renderHook(
      () => usePublicAssets(bounds, 'type-1'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedGetAssets).toHaveBeenCalledWith(bounds, 'type-1');
  });

  it('não passa typeId quando undefined', async () => {
    mockedGetAssets.mockResolvedValue([]);

    const { result } = renderHook(
      () => usePublicAssets('-23.5,-46.6,-23.4,-46.5'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedGetAssets).toHaveBeenCalledWith('-23.5,-46.6,-23.4,-46.5', undefined);
  });
});

describe('usePublicAsset', () => {
  it('busca e retorna o detalhe do asset pelo id', async () => {
    const mockDetail = { id: 'a1', asset_type: { id: '1', name: 'Árvore' }, manejos: [], monitoramentos: [] };
    mockedGetAsset.mockResolvedValue(mockDetail as any);

    const { result } = renderHook(() => usePublicAsset('a1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockDetail);
    expect(mockedGetAsset).toHaveBeenCalledWith('a1');
  });
});

describe('useResolveQR', () => {
  it('fica desabilitado quando code é null', () => {
    const { result } = renderHook(() => useResolveQR(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedResolveQR).not.toHaveBeenCalled();
  });

  it('fica desabilitado quando code é string vazia', () => {
    const { result } = renderHook(() => useResolveQR(''), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('retorna is_available true quando QR é válido', async () => {
    mockedResolveQR.mockResolvedValue({ asset_id: 'a1', is_available: true });

    const { result } = renderHook(
      () => useResolveQR('https://app.ecoinventario.com/a/abc'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.is_available).toBe(true);
  });

  it('retorna is_available false quando QR não está disponível', async () => {
    mockedResolveQR.mockResolvedValue({ asset_id: null, is_available: false });

    const { result } = renderHook(
      () => useResolveQR('https://app.ecoinventario.com/a/nope'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.is_available).toBe(false);
  });
});
