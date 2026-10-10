import { Request, Response } from 'express';
import { syncService } from '../../services/syncService';
import { asyncHandler } from '../../utils/asyncHandler';

export const syncController = {
    runNow: asyncHandler(async (_req: Request, res: Response) => {
        const result = await syncService.syncOnce();
        res.status(200).json({ data: result });
    }),
};