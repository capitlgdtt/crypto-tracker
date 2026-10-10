import { getDb } from '../../db/connection';
import {
    CreatePriceRecordInput,
    PriceHistoryQuery,
    PriceRecord,
} from './types';

interface PriceRow {
    id: number;
    cryptocurrency_id: number;
    price: number;
    currency: string;
    created_at: string;
}

function mapRow(row: PriceRow): PriceRecord {
    return {
        id: row.id,
        cryptocurrencyId: row.cryptocurrency_id,
        price: row.price,
        currency: row.currency,
        createdAt: row.created_at,
    };
}

export const priceRepository = {
    insert(input: CreatePriceRecordInput): PriceRecord {
        const createdAt = input.createdAt ?? new Date().toISOString();

        const info = getDb()
            .prepare(
                `INSERT INTO price_history (cryptocurrency_id, price, currency, created_at)
         VALUES (?, ?, ?, ?)`,
            )
            .run(input.cryptocurrencyId, input.price, input.currency, createdAt);

        const row = getDb()
            .prepare('SELECT * FROM price_history WHERE id = ?')
            .get(Number(info.lastInsertRowid)) as PriceRow;

        return mapRow(row);
    },

    findByCryptocurrencyId(
        cryptoId: number,
        query: PriceHistoryQuery,
    ): PriceRecord[] {
        const conditions: string[] = ['cryptocurrency_id = ?'];
        const params: unknown[] = [cryptoId];

        if (query.from) {
            conditions.push('created_at >= ?');
            params.push(query.from);
        }
        if (query.to) {
            conditions.push('created_at <= ?');
            params.push(query.to);
        }

        params.push(query.limit, query.offset);

        const rows = getDb()
            .prepare(
                `SELECT * FROM price_history
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC, id DESC
         LIMIT ? OFFSET ?`,
            )
            .all(...(params as never[])) as PriceRow[];

        return rows.map(mapRow);
    },

    countByCryptocurrencyId(cryptoId: number, from?: string, to?: string): number {
        const conditions: string[] = ['cryptocurrency_id = ?'];
        const params: unknown[] = [cryptoId];

        if (from) {
            conditions.push('created_at >= ?');
            params.push(from);
        }
        if (to) {
            conditions.push('created_at <= ?');
            params.push(to);
        }

        const row = getDb()
            .prepare(
                `SELECT COUNT(*) AS count FROM price_history WHERE ${conditions.join(' AND ')}`,
            )
            .get(...(params as never[])) as { count: number };

        return row.count;
    },

    findLatestForAll(): PriceRecord[] {
        const rows = getDb()
            .prepare(
                `SELECT id, cryptocurrency_id, price, currency, created_at FROM (
           SELECT ph.*, ROW_NUMBER() OVER (
             PARTITION BY cryptocurrency_id
             ORDER BY created_at DESC, id DESC
           ) AS rn
           FROM price_history ph
         )
         WHERE rn = 1
         ORDER BY cryptocurrency_id ASC`,
            )
            .all() as PriceRow[];

        return rows.map(mapRow);
    },

    findLatestByCryptocurrencyId(cryptoId: number): PriceRecord | null {
        const row = getDb()
            .prepare(
                `SELECT * FROM price_history
         WHERE cryptocurrency_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
            )
            .get(cryptoId) as PriceRow | undefined;

        return row ? mapRow(row) : null;
    },
};