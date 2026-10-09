import { Request, Response } from 'express';
import { parseId, parseName, parseSymbol, parseUpdatePayload } from '../../utils/validators';
import { cryptoService } from './service';

export const cryptoController = {
    list(_req: Request, res: Response): void {
        const items = cryptoService.list();
        res.status(200).json({ data: items });
    },

    getById(req: Request, res: Response): void {
        const id = parseId(req.params.id, 'id');
        const item = cryptoService.getById(id);
        res.status(200).json({ data: item });
    },

    create(req: Request, res: Response): void {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const symbol = parseSymbol(body.symbol);
        const name = parseName(body.name);
        const created = cryptoService.create({ symbol, name });
        res.status(201).json({ data: created });
    },

    update(req: Request, res: Response): void {
        const id = parseId(req.params.id, 'id');
        const patch = parseUpdatePayload(req.body);
        const updated = cryptoService.update(id, patch);
        res.status(200).json({ data: updated });
    },

    delete(req: Request, res: Response): void {
        const id = parseId(req.params.id, 'id');
        cryptoService.delete(id);
        res.status(204).send();
    },
};