import { Application } from 'express';
import request from 'supertest';
import { authHeader, setupTestApp, teardownTestApp } from './helpers/testApp';

const BASE = '/api/cryptocurrencies';

describe('Cryptocurrencies CRUD', () => {
    let app: Application;

    beforeEach(() => {
        app = setupTestApp();
    });

    afterEach(() => {
        teardownTestApp();
    });

    describe('POST /api/cryptocurrencies', () => {
        it('creates a cryptocurrency and returns 201', async () => {
            const res = await request(app)
                .post(BASE)
                .set(authHeader())
                .send({ symbol: 'BTC', name: 'Bitcoin' });

            expect(res.status).toBe(201);
            expect(res.body.data).toMatchObject({
                id: expect.any(Number),
                symbol: 'BTC',
                name: 'Bitcoin',
                lastUpdatedAt: null,
            });
            expect(res.body.data.createdAt).toEqual(expect.any(String));
            expect(res.body.data.updatedAt).toEqual(expect.any(String));
        });

        it('normalizes lowercase symbol to uppercase', async () => {
            const res = await request(app)
                .post(BASE)
                .set(authHeader())
                .send({ symbol: 'eth', name: 'Ethereum' });

            expect(res.status).toBe(201);
            expect(res.body.data.symbol).toBe('ETH');
        });

        it('returns 400 for invalid symbol', async () => {
            const res = await request(app)
                .post(BASE)
                .set(authHeader())
                .send({ symbol: 'b', name: 'Bad' });

            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('BAD_REQUEST');
        });

        it('returns 400 for empty name', async () => {
            const res = await request(app)
                .post(BASE)
                .set(authHeader())
                .send({ symbol: 'BTC', name: '' });

            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('BAD_REQUEST');
        });

        it('returns 400 when body is empty', async () => {
            const res = await request(app)
                .post(BASE)
                .set(authHeader())
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('BAD_REQUEST');
        });

        it('returns 409 for duplicate symbol (case-insensitive)', async () => {
            await request(app)
                .post(BASE)
                .set(authHeader())
                .send({ symbol: 'BTC', name: 'Bitcoin' });

            const res = await request(app)
                .post(BASE)
                .set(authHeader())
                .send({ symbol: 'btc', name: 'Bitcoin again' });

            expect(res.status).toBe(409);
            expect(res.body.error.code).toBe('CONFLICT');
        });
    });

    describe('GET /api/cryptocurrencies', () => {
        it('returns empty list initially', async () => {
            const res = await request(app).get(BASE).set(authHeader());
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });

        it('returns list with created items ordered by id', async () => {
            await request(app).post(BASE).set(authHeader()).send({ symbol: 'BTC', name: 'Bitcoin' });
            await request(app).post(BASE).set(authHeader()).send({ symbol: 'ETH', name: 'Ethereum' });

            const res = await request(app).get(BASE).set(authHeader());
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.data[0].symbol).toBe('BTC');
            expect(res.body.data[1].symbol).toBe('ETH');
        });
    });

    describe('GET /api/cryptocurrencies/:id', () => {
        it('returns existing item', async () => {
            const created = await request(app)
                .post(BASE)
                .set(authHeader())
                .send({ symbol: 'BTC', name: 'Bitcoin' });

            const res = await request(app)
                .get(`${BASE}/${created.body.data.id}`)
                .set(authHeader());

            expect(res.status).toBe(200);
            expect(res.body.data.symbol).toBe('BTC');
        });

        it('returns 404 for unknown id', async () => {
            const res = await request(app).get(`${BASE}/9999`).set(authHeader());
            expect(res.status).toBe(404);
            expect(res.body.error.code).toBe('NOT_FOUND');
        });

        it('returns 400 for non-numeric id', async () => {
            const res = await request(app).get(`${BASE}/abc`).set(authHeader());
            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('BAD_REQUEST');
        });
    });

    describe('PATCH /api/cryptocurrencies/:id', () => {
        it('updates name only', async () => {
            const created = await request(app)
                .post(BASE)
                .set(authHeader())
                .send({ symbol: 'BTC', name: 'Bitcoin' });

            const res = await request(app)
                .patch(`${BASE}/${created.body.data.id}`)
                .set(authHeader())
                .send({ name: 'Bitcoin Updated' });

            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe('Bitcoin Updated');
            expect(res.body.data.symbol).toBe('BTC');
        });

        it('returns 400 when patch has no known fields', async () => {
            const created = await request(app)
                .post(BASE)
                .set(authHeader())
                .send({ symbol: 'BTC', name: 'Bitcoin' });

            const res = await request(app)
                .patch(`${BASE}/${created.body.data.id}`)
                .set(authHeader())
                .send({});

            expect(res.status).toBe(400);
        });

        it('returns 404 for unknown id', async () => {
            const res = await request(app)
                .patch(`${BASE}/9999`)
                .set(authHeader())
                .send({ name: 'X' });

            expect(res.status).toBe(404);
        });

        it('returns 409 when updating to existing symbol', async () => {
            await request(app).post(BASE).set(authHeader()).send({ symbol: 'BTC', name: 'Bitcoin' });
            const eth = await request(app).post(BASE).set(authHeader()).send({ symbol: 'ETH', name: 'Ethereum' });

            const res = await request(app)
                .patch(`${BASE}/${eth.body.data.id}`)
                .set(authHeader())
                .send({ symbol: 'BTC' });

            expect(res.status).toBe(409);
        });
    });

    describe('DELETE /api/cryptocurrencies/:id', () => {
        it('deletes existing item and returns 204', async () => {
            const created = await request(app)
                .post(BASE)
                .set(authHeader())
                .send({ symbol: 'BTC', name: 'Bitcoin' });

            const del = await request(app)
                .delete(`${BASE}/${created.body.data.id}`)
                .set(authHeader());

            expect(del.status).toBe(204);
            expect(del.text).toBe('');

            const get = await request(app)
                .get(`${BASE}/${created.body.data.id}`)
                .set(authHeader());

            expect(get.status).toBe(404);
        });

        it('returns 404 for unknown id', async () => {
            const res = await request(app).delete(`${BASE}/9999`).set(authHeader());
            expect(res.status).toBe(404);
        });
    });
});