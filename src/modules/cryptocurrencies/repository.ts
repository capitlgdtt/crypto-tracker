import { getDb } from '../../db/connection';
import { ConflictError } from '../../utils/errors';
import {
    CreateCryptocurrencyInput,
    Cryptocurrency,
    UpdateCryptocurrencyInput,
} from './types';

interface CryptoRow {
    id: number;
    symbol: string;
    name: string;
    last_updated_at: string | null;
    created_at: string;
    updated_at: string;
}

function mapRow(row: CryptoRow): Cryptocurrency {
    return {
        id: row.id,
        symbol: row.symbol,
        name: row.name,
        lastUpdatedAt: row.last_updated_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function isUniqueConstraintError(err: unknown): boolean {
    return (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: unknown }).code === 'SQLITE_CONSTRAINT_UNIQUE'
    );
}

export const cryptoRepository = {
    findAll(): Cryptocurrency[] {
        const rows = getDb()
            .prepare('SELECT * FROM cryptocurrencies ORDER BY id ASC')
            .all() as CryptoRow[];
        return rows.map(mapRow);
    },

    findById(id: number): Cryptocurrency | null {
        const row = getDb()
            .prepare('SELECT * FROM cryptocurrencies WHERE id = ?')
            .get(id) as CryptoRow | undefined;
        return row ? mapRow(row) : null;
    },

    findBySymbol(symbol: string): Cryptocurrency | null {
        const row = getDb()
            .prepare('SELECT * FROM cryptocurrencies WHERE symbol = ? COLLATE NOCASE')
            .get(symbol) as CryptoRow | undefined;
        return row ? mapRow(row) : null;
    },

    create(input: CreateCryptocurrencyInput): Cryptocurrency {
        const now = new Date().toISOString();
        try {
            const info = getDb()
                .prepare(
                    `INSERT INTO cryptocurrencies (symbol, name, created_at, updated_at)
           VALUES (?, ?, ?, ?)`,
                )
                .run(input.symbol, input.name, now, now);

            const created = this.findById(Number(info.lastInsertRowid));
            if (!created) {
                throw new Error('Failed to load created cryptocurrency');
            }
            return created;
        } catch (err) {
            if (isUniqueConstraintError(err)) {
                throw new ConflictError(
                    `Cryptocurrency with symbol "${input.symbol}" already exists`,
                    { field: 'symbol', value: input.symbol },
                );
            }
            throw err;
        }
    },

    update(id: number, patch: UpdateCryptocurrencyInput): Cryptocurrency | null {
        const fields: string[] = [];
        const values: unknown[] = [];

        if (patch.symbol !== undefined) {
            fields.push('symbol = ?');
            values.push(patch.symbol);
        }
        if (patch.name !== undefined) {
            fields.push('name = ?');
            values.push(patch.name);
        }

        fields.push('updated_at = ?');
        values.push(new Date().toISOString());

        values.push(id);

        try {
            const info = getDb()
                .prepare(`UPDATE cryptocurrencies SET ${fields.join(', ')} WHERE id = ?`)
                .run(...(values as never[]));

            if (info.changes === 0) return null;
            return this.findById(id);
        } catch (err) {
            if (isUniqueConstraintError(err)) {
                throw new ConflictError(
                    `Cryptocurrency with symbol "${patch.symbol}" already exists`,
                    { field: 'symbol', value: patch.symbol },
                );
            }
            throw err;
        }
    },

    delete(id: number): boolean {
        const info = getDb()
            .prepare('DELETE FROM cryptocurrencies WHERE id = ?')
            .run(id);
        return info.changes > 0;
    },

    updateLastUpdatedAt(id: number, isoTimestamp: string): void {
        getDb()
            .prepare('UPDATE cryptocurrencies SET last_updated_at = ? WHERE id = ?')
            .run(isoTimestamp, id);
    },
};