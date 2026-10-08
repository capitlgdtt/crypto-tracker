import { getDb } from './connection';

export function runMigrations(): void {
    const db = getDb();

    db.exec(`
    CREATE TABLE IF NOT EXISTS cryptocurrencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      last_updated_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cryptocurrency_id INTEGER NOT NULL,
      price REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (cryptocurrency_id) REFERENCES cryptocurrencies(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_price_history_crypto_created
      ON price_history (cryptocurrency_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_price_history_created
      ON price_history (created_at DESC);
  `);
}