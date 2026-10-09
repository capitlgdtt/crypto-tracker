import { Application } from 'express';
import request from 'supertest';
import { setupTestApp, teardownTestApp } from './helpers/testApp';

describe('Authentication middleware', () => {
    let app: Application;

    beforeEach(() => {
        app = setupTestApp();
    });

    afterEach(() => {
        teardownTestApp();
    });

    it('returns 401 when Authorization header is missing', async () => {
        const res = await request(app).get('/api/cryptocurrencies');
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 when Authorization header has wrong scheme', async () => {
        const res = await request(app)
            .get('/api/cryptocurrencies')
            .set('Authorization', 'Basic abc123');
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 when Bearer token is invalid', async () => {
        const res = await request(app)
            .get('/api/cryptocurrencies')
            .set('Authorization', 'Bearer wrong-key');
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 for empty Bearer token', async () => {
        const res = await request(app)
            .get('/api/cryptocurrencies')
            .set('Authorization', 'Bearer ');
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('allows request with valid Bearer token', async () => {
        const res = await request(app)
            .get('/api/cryptocurrencies')
            .set('Authorization', 'Bearer test-api-key');
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
    });

    it('does not require auth for /health', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
    });
});