import { useSyncStore } from '../sync-store';

beforeEach(() => {
  useSyncStore.setState({
    status: { state: 'idle' },
    lastSyncAt: null,
    pendingMetadataCount: 0,
    pendingMediaCount: 0,
    conflictCount: 0,
  });
});

describe('sync store — estado inicial', () => {
  test('status começa como idle', () => {
    expect(useSyncStore.getState().status).toEqual({ state: 'idle' });
  });

  test('lastSyncAt começa nulo', () => {
    expect(useSyncStore.getState().lastSyncAt).toBeNull();
  });

  test('contadores começam em zero', () => {
    const { pendingMetadataCount, pendingMediaCount, conflictCount } = useSyncStore.getState();
    expect(pendingMetadataCount).toBe(0);
    expect(pendingMediaCount).toBe(0);
    expect(conflictCount).toBe(0);
  });
});

describe('sync store — setStatus', () => {
  test('atualiza para syncing com progress', () => {
    useSyncStore.getState().setStatus({ state: 'syncing', progress: 42 });
    expect(useSyncStore.getState().status).toEqual({ state: 'syncing', progress: 42 });
  });

  test('atualiza para error com mensagem', () => {
    useSyncStore.getState().setStatus({ state: 'error', message: 'timeout' });
    expect(useSyncStore.getState().status).toEqual({ state: 'error', message: 'timeout' });
  });

  test('atualiza para conflict com count', () => {
    useSyncStore.getState().setStatus({ state: 'conflict', count: 3 });
    expect(useSyncStore.getState().status).toEqual({ state: 'conflict', count: 3 });
  });

  test('atualiza para offline com pendingCount', () => {
    useSyncStore.getState().setStatus({ state: 'offline', pendingCount: 7 });
    expect(useSyncStore.getState().status).toEqual({ state: 'offline', pendingCount: 7 });
  });
});

describe('sync store — setLastSyncAt', () => {
  test('armazena timestamp ISO', () => {
    const ts = '2026-04-25T10:00:00Z';
    useSyncStore.getState().setLastSyncAt(ts);
    expect(useSyncStore.getState().lastSyncAt).toBe(ts);
  });
});

describe('sync store — setCounts', () => {
  test('atualiza todos os contadores', () => {
    useSyncStore.getState().setCounts(5, 3, 1);
    const { pendingMetadataCount, pendingMediaCount, conflictCount } = useSyncStore.getState();
    expect(pendingMetadataCount).toBe(5);
    expect(pendingMediaCount).toBe(3);
    expect(conflictCount).toBe(1);
  });

  test('aceita contadores zerados', () => {
    useSyncStore.getState().setCounts(10, 10, 10);
    useSyncStore.getState().setCounts(0, 0, 0);
    const { pendingMetadataCount, pendingMediaCount, conflictCount } = useSyncStore.getState();
    expect(pendingMetadataCount).toBe(0);
    expect(pendingMediaCount).toBe(0);
    expect(conflictCount).toBe(0);
  });
});
