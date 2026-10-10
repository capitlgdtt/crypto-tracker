import { Application } from 'express';
import request from 'supertest';
import { authHeader, setupTestApp, teardownTestApp } from './helpers/testApp';
import { syncService } from '../src/services/syncService';
import { ExternalApiError, ServiceUnavailableError } from '../src/utils/errors';

jest.mock('../src/services/syncService', () => ({
    syncService: { syncOnce: jest.fn() },
}));

const mockSyncOnce = syncService.syncOnce as jest.Mock;

describe('POST /api/sync', () => {
    let app: Application;

    beforeEach(() => {
        app = setupTestApp();
        jest.clearAllMocks();
    });

    afterEach(() => {
        teardownTestApp();
    });

    it('runs sync and returns result', async () => {
        mockSyncOnce.mockResolvedValue({
            total: 2,
            updated: 2,
            skipped: 0,
            errors: [],
        });

        const res = await request(app).post('/api/sync').set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({
            total: 2,
            updated: 2,
            skipped: 0,
            errors: [],
        });
        expect(mockSyncOnce).toHaveBeenCalledTimes(1);
    });

    it('returns 502 when external API fails', async () => {
        mockSyncOnce.mockRejectedValue(new ExternalApiError('CMC error'));

        const res = await request(app).post('/api/sync').set(authHeader());

        expect(res.status).toBe(502);
        expect(res.body.error.code).toBe('EXTERNAL_API_ERROR');
    });

    it('returns 503 when external API is unavailable', async () => {
        mockSyncOnce.mockRejectedValue(new ServiceUnavailableError('timeout'));

        const res = await request(app).post('/api/sync').set(authHeader());

        expect(res.status).toBe(503);
        expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('returns 401 without auth', async () => {
        const res = await request(app).post('/api/sync');
        expect(res.status).toBe(401);
    });
});