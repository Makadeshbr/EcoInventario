import { runMigrations } from '../migrations';

const mockDb = {
  execAsync: jest.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('runMigrations', () => {
  test('chama execAsync ao menos uma vez', async () => {
    await runMigrations(mockDb as any);
    expect(mockDb.execAsync).toHaveBeenCalledTimes(1);
  });

  test('cria tabelas de domínio: asset_types, assets, media, manejos, monitoramentos', async () => {
    await runMigrations(mockDb as any);
    const sql: string = mockDb.execAsync.mock.calls[0][0];
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS asset_types');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS assets');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS media');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS manejos');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS monitoramentos');
  });

  test('cria tabelas de sync: sync_queue, media_upload_queue, sync_metadata, sync_conflicts', async () => {
    await runMigrations(mockDb as any);
    const sql: string = mockDb.execAsync.mock.calls[0][0];
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS sync_queue');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS media_upload_queue');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS sync_metadata');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS sync_conflicts');
  });

  test('cria índices de performance', async () => {
    await runMigrations(mockDb as any);
    const sql: string = mockDb.execAsync.mock.calls[0][0];
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_sync_queue_status');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_media_upload_status');
  });

  test('assets tem campo is_synced', async () => {
    await runMigrations(mockDb as any);
    const sql: string = mockDb.execAsync.mock.calls[0][0];
    const assetsBlock = sql.slice(
      sql.indexOf('CREATE TABLE IF NOT EXISTS assets'),
      sql.indexOf('CREATE TABLE IF NOT EXISTS media'),
    );
    expect(assetsBlock).toContain('is_synced');
  });
});
