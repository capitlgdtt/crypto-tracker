import { BadRequestError } from './errors';

const SYMBOL_RE = /^[A-Z0-9]{2,10}$/;
const NAME_MIN = 1;
const NAME_MAX = 100;
const ID_RE = /^[1-9]\d*$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z?)?$/;

export function parseId(raw: unknown, field = 'id'): number {
    if (typeof raw !== 'string' || !ID_RE.test(raw)) {
        throw new BadRequestError(`Invalid ${field}`, { field, value: raw });
    }
    const value = Number(raw);
    if (!Number.isSafeInteger(value)) {
        throw new BadRequestError(`Invalid ${field}`, { field, value: raw });
    }
    return value;
}

export function parseSymbol(raw: unknown): string {
    if (typeof raw !== 'string') {
        throw new BadRequestError('Symbol must be a string', { field: 'symbol' });
    }
    const value = raw.trim().toUpperCase();
    if (!SYMBOL_RE.test(value)) {
        throw new BadRequestError(
            'Symbol must be 2-10 uppercase alphanumeric characters',
            { field: 'symbol', value: raw },
        );
    }
    return value;
}

export function parseName(raw: unknown): string {
    if (typeof raw !== 'string') {
        throw new BadRequestError('Name must be a string', { field: 'name' });
    }
    const value = raw.trim();
    if (value.length < NAME_MIN || value.length > NAME_MAX) {
        throw new BadRequestError(
            `Name must be between ${NAME_MIN} and ${NAME_MAX} characters`,
            { field: 'name' },
        );
    }
    return value;
}

export function parseUpdatePayload(body: unknown): { symbol?: string; name?: string } {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new BadRequestError('Request body must be a JSON object');
    }
    const obj = body as Record<string, unknown>;
    const result: { symbol?: string; name?: string } = {};

    if ('symbol' in obj) result.symbol = parseSymbol(obj.symbol);
    if ('name' in obj) result.name = parseName(obj.name);

    if (Object.keys(result).length === 0) {
        throw new BadRequestError('At least one field (symbol, name) must be provided');
    }
    return result;
}

export function parseOptionalIsoDate(raw: unknown, field: string): string | undefined {
    if (raw === undefined || raw === null || raw === '') return undefined;
    if (typeof raw !== 'string' || !ISO_DATE_RE.test(raw)) {
        throw new BadRequestError(`Invalid ${field}: expected ISO 8601 date string`, {
            field,
            value: raw,
        });
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestError(`Invalid ${field}: unparsable date`, {
            field,
            value: raw,
        });
    }
    return parsed.toISOString();
}

export function parseLimit(raw: unknown, fallback = 100, max = 1000): number {
    if (raw === undefined || raw === null || raw === '') return fallback;
    if (typeof raw !== 'string' || !ID_RE.test(raw)) {
        throw new BadRequestError('Invalid limit: expected positive integer', {
            field: 'limit',
            value: raw,
        });
    }
    const value = Number(raw);
    if (value < 1 || value > max) {
        throw new BadRequestError(`Invalid limit: must be between 1 and ${max}`, {
            field: 'limit',
            value: raw,
        });
    }
    return value;
}

export function parseOffset(raw: unknown, fallback = 0): number {
    if (raw === undefined || raw === null || raw === '') return fallback;
    if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
        throw new BadRequestError('Invalid offset: expected non-negative integer', {
            field: 'offset',
            value: raw,
        });
    }
    return Number(raw);
}