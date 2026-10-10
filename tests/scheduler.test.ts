import { Scheduler } from '../src/services/scheduler';
import { syncService, SyncResult } from '../src/services/syncService';

jest.mock('../src/services/syncService', () => ({
    syncService: { syncOnce: jest.fn() },
}));

const mockSyncOnce = syncService.syncOnce as jest.Mock;

const emptyResult: SyncResult = { total: 0, updated: 0, skipped: 0, errors: [] };

interface Deferred {
    promise: Promise<SyncResult>;
    resolve: () => void;
}

function deferred(): Deferred {
    let resolveFn: (() => void) | null = null;
    const promise = new Promise<SyncResult>((resolve) => {
        resolveFn = () => resolve(emptyResult);
    });
    return {
        promise,
        resolve: () => resolveFn!(),
    };
}

describe('Scheduler', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('runs sync on each interval tick', async () => {
        mockSyncOnce.mockResolvedValue(emptyResult);

        const scheduler = new Scheduler({ intervalMs: 1000, logger: () => undefined });
        scheduler.start();

        expect(mockSyncOnce).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(1000);
        expect(mockSyncOnce).toHaveBeenCalledTimes(1);

        await jest.advanceTimersByTimeAsync(1000);
        expect(mockSyncOnce).toHaveBeenCalledTimes(2);

        await scheduler.stop();
    });

    it('stop prevents further ticks', async () => {
        mockSyncOnce.mockResolvedValue(emptyResult);

        const scheduler = new Scheduler({ intervalMs: 1000, logger: () => undefined });
        scheduler.start();

        await jest.advanceTimersByTimeAsync(1000);
        expect(mockSyncOnce).toHaveBeenCalledTimes(1);

        await scheduler.stop();

        await jest.advanceTimersByTimeAsync(5000);
        expect(mockSyncOnce).toHaveBeenCalledTimes(1);
    });

    it('waits for the in-flight sync when stopping', async () => {
        const d = deferred();
        mockSyncOnce.mockReturnValue(d.promise);

        const scheduler = new Scheduler({ intervalMs: 1000, logger: () => undefined });
        scheduler.start();

        await jest.advanceTimersByTimeAsync(1000);
        expect(mockSyncOnce).toHaveBeenCalledTimes(1);

        let stopped = false;
        const stopPromise = scheduler.stop().then(() => {
            stopped = true;
        });

        await Promise.resolve();
        expect(stopped).toBe(false);

        d.resolve();
        await stopPromise;
        expect(stopped).toBe(true);
    });

    it('does not start a new run while the previous one is still running', async () => {
        const d = deferred();
        mockSyncOnce.mockReturnValue(d.promise);

        const scheduler = new Scheduler({ intervalMs: 1000, logger: () => undefined });
        scheduler.start();

        await jest.advanceTimersByTimeAsync(1000);
        expect(mockSyncOnce).toHaveBeenCalledTimes(1);

        await jest.advanceTimersByTimeAsync(1000);
        await jest.advanceTimersByTimeAsync(1000);
        expect(mockSyncOnce).toHaveBeenCalledTimes(1);

        d.resolve();
        await jest.advanceTimersByTimeAsync(1000);
        expect(mockSyncOnce).toHaveBeenCalledTimes(2);

        await scheduler.stop();
    });

    it('logs and swallows sync errors', async () => {
        const logger = jest.fn();
        mockSyncOnce.mockRejectedValue(new Error('CMC down'));

        const scheduler = new Scheduler({ intervalMs: 1000, logger });
        scheduler.start();

        await jest.advanceTimersByTimeAsync(1000);

        expect(logger).toHaveBeenCalledWith(expect.stringContaining('Sync failed'));

        await scheduler.stop();
    });
});