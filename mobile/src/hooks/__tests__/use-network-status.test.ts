import { renderHook, act } from '@testing-library/react-native';

type NetInfoCallback = (state: { isConnected: boolean | null }) => void;

let capturedCallback: NetInfoCallback | null = null;
const mockUnsubscribe = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((cb: NetInfoCallback) => {
    capturedCallback = cb;
    return mockUnsubscribe;
  }),
}));

import { useNetworkStatus } from '../use-network-status';

beforeEach(() => {
  capturedCallback = null;
  jest.clearAllMocks();
});

describe('useNetworkStatus', () => {
  test('inicia com isConnected true', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isConnected).toBe(true);
  });

  test('atualiza para false quando NetInfo reporta desconectado', () => {
    const { result } = renderHook(() => useNetworkStatus());
    act(() => {
      capturedCallback?.({ isConnected: false });
    });
    expect(result.current.isConnected).toBe(false);
  });

  test('trata isConnected null como false', () => {
    const { result } = renderHook(() => useNetworkStatus());
    act(() => {
      capturedCallback?.({ isConnected: null });
    });
    expect(result.current.isConnected).toBe(false);
  });

  test('atualiza de volta para true quando reconecta', () => {
    const { result } = renderHook(() => useNetworkStatus());
    act(() => {
      capturedCallback?.({ isConnected: false });
    });
    act(() => {
      capturedCallback?.({ isConnected: true });
    });
    expect(result.current.isConnected).toBe(true);
  });

  test('chama unsubscribe no unmount', () => {
    const { unmount } = renderHook(() => useNetworkStatus());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
