import { Application } from 'express';
import request from 'supertest';
import { authHeader, setupTestApp, teardownTestApp } from './helpers/testApp';
import { seedCrypto, seedPrice } from './helpers/seed';

const CRYPTO_BASE = '/api/cryptocurrencies';
const PRICES_BASE = '/api/prices';

describe('Prices endpoints', () => {
    let app: Application;

    beforeEach(() => {
        app = setupTestApp();
    });

    afterEach(() => {
        teardownTestApp();
    });

    describe('GET /api/cryptocurrencies/:id/prices', () => {
        it('returns empty list when crypto exists but has no prices', async () => {
            const crypto = seedCrypto('BTC', 'Bitcoin');

            const res = await request(app)
                .get(`${CRYPTO_BASE}/${crypto.id}/prices`)
                .set(authHeader());

            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
            expect(res.body.meta).toEqual({ total: 0, limit: 100, offset: 0 });
        });

        it('returns price history ordered by createdAt DESC', async () => {
            const crypto = seedCrypto('BTC', 'Bitcoin');
            seedPrice(crypto.id, 100, '2026-01-01T00:00:00.000Z');
            seedPrice(crypto.id, 200, '2026-01-02T00:00:00.000Z');
            seedPrice(crypto.id, 300, '2026-01-03T00:00:00.000Z');

            const res = await request(app)
                .get(`${CRYPTO_BASE}/${crypto.id}/prices`)
                .set(authHeader());

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(3);
            expect(res.body.data.map((r: { price: number }) => r.price)).toEqual([300, 200, 100]);
            expect(res.body.meta.total).toBe(3);
        });

        it('filters by from and to', async () => {
            const crypto = seedCrypto('BTC', 'Bitcoin');
            seedPrice(crypto.id, 100, '2026-01-01T00:00:00.000Z');
            seedPrice(crypto.id, 200, '2026-01-02T00:00:00.000Z');
            seedPrice(crypto.id, 300, '2026-01-03T00:00:00.000Z');

            const res = await request(app)
                .get(
                    `${CRYPTO_BASE}/${crypto.id}/prices?from=2026-01-02T00:00:00.000Z&to=2026-01-03T00:00:00.000Z`,
                )
                .set(authHeader());

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.data.map((r: { price: number }) => r.price)).toEqual([300, 200]);
            expect(res.body.meta.total).toBe(2);
        });

        it('applies limit and offset', async () => {
            const crypto = seedCrypto('BTC', 'Bitcoin');
            seedPrice(crypto.id, 100, '2026-01-01T00:00:00.000Z');
            seedPrice(crypto.id, 200, '2026-01-02T00:00:00.000Z');
            seedPrice(crypto.id, 300, '2026-01-03T00:00:00.000Z');

            const res = await request(app)
                .get(`${CRYPTO_BASE}/${crypto.id}/prices?limit=1&offset=1`)
                .set(authHeader());

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].price).toBe(200);
            expect(res.body.meta).toEqual({ total: 3, limit: 1, offset: 1 });
        });

        it('returns 404 for unknown crypto id', async () => {
            const res = await request(app)
                .get(`${CRYPTO_BASE}/9999/prices`)
                .set(authHeader());

            expect(res.status).toBe(404);
            expect(res.body.error.code).toBe('NOT_FOUND');
        });

        it('returns 400 for invalid limit', async () => {
            const crypto = seedCrypto('BTC', 'Bitcoin');

            const res = await request(app)
                .get(`${CRYPTO_BASE}/${crypto.id}/prices?limit=abc`)
                .set(authHeader());

            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('BAD_REQUEST');
        });

        it('returns 400 for invalid from date', async () => {
            const crypto = seedCrypto('BTC', 'Bitcoin');

            const res = await request(app)
                .get(`${CRYPTO_BASE}/${crypto.id}/prices?from=not-a-date`)
                .set(authHeader());

            expect(res.status).toBe(400);
        });

        it('returns 401 without auth', async () => {
            const crypto = seedCrypto('BTC', 'Bitcoin');

            const res = await request(app).get(`${CRYPTO_BASE}/${crypto.id}/prices`);
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/prices/latest', () => {
        it('returns empty list when nothing tracked', async () => {
            const res = await request(app).get(`${PRICES_BASE}/latest`).set(authHeader());
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });

        it('returns latest price per cryptocurrency', async () => {
            const btc = seedCrypto('BTC', 'Bitcoin');
            const eth = seedCrypto('ETH', 'Ethereum');
            seedPrice(btc.id, 100, '2026-01-01T00:00:00.000Z');
            seedPrice(btc.id, 500, '2026-01-02T00:00:00.000Z');
            seedPrice(eth.id, 2000, '2026-01-02T00:00:00.000Z');

            const res = await request(app).get(`${PRICES_BASE}/latest`).set(authHeader());

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(2);

            const bySymbol = Object.fromEntries(
                res.body.data.map((r: { symbol: string; price: number }) => [r.symbol, r.price]),
            );
            expect(bySymbol.BTC).toBe(500);
            expect(bySymbol.ETH).toBe(2000);
        });

        it('filters by symbols query', async () => {
            const btc = seedCrypto('BTC', 'Bitcoin');
            const eth = seedCrypto('ETH', 'Ethereum');
            seedPrice(btc.id, 500, '2026-01-02T00:00:00.000Z');
            seedPrice(eth.id, 2000, '2026-01-02T00:00:00.000Z');

            const res = await request(app)
                .get(`${PRICES_BASE}/latest?symbols=ETH`)
                .set(authHeader());

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].symbol).toBe('ETH');
            expect(res.body.data[0].price).toBe(2000);
        });

        it('skips cryptocurrencies without any price records', async () => {
            seedCrypto('BTC', 'Bitcoin');
            const eth = seedCrypto('ETH', 'Ethereum');
            seedPrice(eth.id, 2000, '2026-01-02T00:00:00.000Z');

            const res = await request(app).get(`${PRICES_BASE}/latest`).set(authHeader());

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].symbol).toBe('ETH');
        });

        it('returns 401 without auth', async () => {
            const res = await request(app).get(`${PRICES_BASE}/latest`);
            expect(res.status).toBe(401);
        });
    });
});