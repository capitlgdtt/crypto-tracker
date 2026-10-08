import 'dotenv/config';
import { createApp } from './app';
import { config } from './config';
import { closeDb, initDb } from './db/connection';
import { runMigrations } from './db/migrate';

function main(): void {
    initDb();
    runMigrations();

    const app = createApp();
    const server = app.listen(config.port, () => {
        // eslint-disable-next-line no-console
        console.log(`Server listening on port ${config.port} (${config.nodeEnv})`);
    });

    const shutdown = (signal: string): void => {
        // eslint-disable-next-line no-console
        console.log(`Received ${signal}, shutting down...`);
        server.close(() => {
            closeDb();
            process.exit(0);
        });

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