import { Application } from 'express';
import { createApp } from '../../src/app';
import { closeDb, initDb } from '../../src/db/connection';
import { runMigrations } from '../../src/db/migrate';

export function setupTestApp(): Application {
    closeDb();
    initDb();
    runMigrations();
    return createApp();
}

export function teardownTestApp(): void {
    closeDb();
}

export const TEST_API_KEY = 'test-api-key';

export function authHeader(): { Authorization: string } {
    return { Authorization: `Bearer ${TEST_API_KEY}` };
}