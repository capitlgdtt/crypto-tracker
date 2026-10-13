import 'dotenv/config';
import { createApp } from './app';
import { config } from './config';
import { closeDb, initDb } from './db/connection';
import { runMigrations } from './db/migrate';
import { Scheduler } from './services/scheduler';

function main(): void {
    initDb();
    runMigrations();

    const scheduler = new Scheduler({ intervalMs: config.syncIntervalMs });
    scheduler.start();

    const app = createApp();
    const server = app.listen(config.port, () => {
        // eslint-disable-next-line no-console
        console.log(`Server listening on port ${config.port} (${config.nodeEnv})`);
    });

    let shuttingDown = false;

    const shutdown = (signal: string): void => {
        if (shuttingDown) return;
        shuttingDown = true;

        // eslint-disable-next-line no-console
        console.log(`Received ${signal}, shutting down...`);

        server.close(async () => {
            try {
                await scheduler.stop();
            } finally {
                closeDb();
                process.exit(0);
            }
        });

        // Force exit if graceful shutdown hangs
        setTimeout(() => {
            // eslint-disable-next-line no-console
            console.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10_000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();