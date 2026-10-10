import { Request, Response } from 'express';
import { parseId, parseLimit, parseOffset, parseOptionalIsoDate } from '../../utils/validators';
import { priceService } from './service';

function parseSymbolsQuery(raw: unknown): string[] | undefined {
    if (raw === undefined || raw === null || raw === '') return undefined;
    if (typeof raw !== 'string') return undefined;
    const parts = raw
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0);
    return parts.length > 0 ? parts : undefined;
}

export const priceController = {
    history(req: Request, res: Response): void {
        const id = parseId(req.params.id, 'id');
        const from = parseOptionalIsoDate(req.query.from, 'from');
        const to = parseOptionalIsoDate(req.query.to, 'to');
        const limit = parseLimit(req.query.limit);
        const offset = parseOffset(req.query.offset);

        const result = priceService.history(id, { from, to, limit, offset });

        res.status(200).json({
            data: result.items,
            meta: {
                total: result.total,
                limit: result.limit,
                offset: result.offset,
            },
        });
    },

    latest(req: Request, res: Response): void {
        const symbols = parseSymbolsQuery(req.query.symbols);
        const items = priceService.latestForSymbols(symbols);
        res.status(200).json({ data: items });
    },
};