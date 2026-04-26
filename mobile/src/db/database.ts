// TODO: Sem teste — config/infra (abertura de conexão nativa)
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('eco-inventario.db');
  }
  return db;
}
