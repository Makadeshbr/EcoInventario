const mockDb = {
  closeAsync: jest.fn().mockResolvedValue(undefined),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => mockDb),
  deleteDatabaseAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../migrations', () => ({
  runMigrations: jest.fn().mockResolvedValue(undefined),
}));

import * as SQLite from 'expo-sqlite';
import { runMigrations } from '../migrations';
import { getDb, resetLocalDatabase } from '../database';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('database', () => {
  test('resetLocalDatabase fecha, remove e recria banco com migrations', async () => {
    const currentDb = getDb();

    await resetLocalDatabase();

    expect(currentDb.closeAsync).toHaveBeenCalledTimes(1);
    expect(SQLite.deleteDatabaseAsync).toHaveBeenCalledWith('eco-inventario.db');
    expect(SQLite.openDatabaseSync).toHaveBeenCalledWith('eco-inventario.db');
    expect(runMigrations).toHaveBeenCalledWith(mockDb);
  });
});
