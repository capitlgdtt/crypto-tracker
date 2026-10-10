import { syncService, SyncResult } from './syncService';

interface SchedulerOptions {
    intervalMs: number;
    logger?: (message: string) => void;
}

export class Scheduler {
    private timer: NodeJS.Timeout | null = null;
    private running = false;
    private currentRun: Promise<void> | null = null;
    private stopped = false;

    constructor(private readonly options: SchedulerOptions) {}

    start(): void {
        if (this.timer) return;
        this.stopped = false;

        this.timer = setInterval(() => {
            void this.tick();
        }, this.options.intervalMs);

        // Do not keep the event loop alive just because of this timer
        this.timer.unref();
    }

    async stop(): Promise<void> {
        this.stopped = true;

        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        if (this.currentRun) {
            await this.currentRun;
        }
    }

    async runNow(): Promise<SyncResult> {
        return syncService.syncOnce();
    }

    private async tick(): Promise<void> {
        if (this.running || this.stopped) return;
        this.running = true;

        this.currentRun = (async () => {
            try {
                const result = await syncService.syncOnce();
                this.log(
                    `Sync finished: total=${result.total} updated=${result.updated} ` +
                    `skipped=${result.skipped}${
                        result.errors.length > 0 ? ` errors=${result.errors.length}` : ''
                    }`,
                );
                for (const error of result.errors) {
                    this.log(`Sync warning: ${error}`);
                }
            } catch (err) {
                this.log(
                    `Sync failed: ${err instanceof Error ? err.message : 'unknown error'}`,
                );
            } finally {
                this.running = false;
                this.currentRun = null;
            }
        })();

        await this.currentRun;
    }

    private log(message: string): void {
        if (this.options.logger) {
            this.options.logger(message);
            return;
        }
        // eslint-disable-next-line no-console
        console.log(`[scheduler] ${message}`);
    }
}