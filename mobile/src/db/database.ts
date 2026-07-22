// TODO: Sem teste - config/infra (abertura de conexao nativa)
import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

const DATABASE_NAME = 'eco-inventario.db';
let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DATABASE_NAME);
  }
  return db;
}

export async function resetLocalDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }

  await SQLite.deleteDatabaseAsync(DATABASE_NAME);
  await runMigrations(getDb());
}
