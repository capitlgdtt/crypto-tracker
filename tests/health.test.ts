import { Application } from 'express';
import request from 'supertest';
import {setupTestApp, teardownTestApp} from "./helpers/testApp";

describe('Health and fallback routes', () => {
    let app: Application;

    beforeEach(() => {
        app = setupTestApp();
    });

    afterEach(() => {
        teardownTestApp();
    });

    it('GET /health returns 200 with status ok', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok' });
    });

    it('GET /unknown returns 404 with NOT_FOUND code', async () => {
        const res = await request(app).get('/unknown');
        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: { code: 'NOT_FOUND', message: 'Route not found' },
        });
    });
});