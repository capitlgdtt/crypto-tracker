import { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';

function safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
    try {
        const header = req.headers.authorization;

        if (!header || !header.startsWith('Bearer ')) {
            throw new UnauthorizedError('Missing or malformed Authorization header');
        }

        const token = header.slice('Bearer '.length).trim();

        if (!token || !safeEqual(token, config.apiKey)) {
            throw new UnauthorizedError('Invalid API key');
        }

        next();
    } catch (err) {
        next(err);
    }
}