import express, { Application } from 'express';
import { AppError } from './utils/errors';

export function createApp(): Application {
    const app = express();

    app.use(express.json());

    app.get('/health', (_req, res) => {
        res.status(200).json({ status: 'ok' });
    });

    app.use((_req, res) => {
        res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Route not found' },
        });
    });

    app.use(
        (
            err: unknown,
            _req: express.Request,
            res: express.Response,
            _next: express.NextFunction,
        ) => {
            if (err instanceof AppError) {
                res.status(err.statusCode).json({
                    error: {
                        code: err.code,
                        message: err.message,
                        ...(err.details !== undefined ? { details: err.details } : {}),
                    },
                });
                return;
            }

            // eslint-disable-next-line no-console
            console.error('Unhandled error:', err);
            res.status(500).json({
                error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
            });
        },
    );

    return app;
}