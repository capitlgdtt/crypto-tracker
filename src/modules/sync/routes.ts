import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { syncController } from './controller';

export const syncRouter = Router();

syncRouter.use(authMiddleware);

syncRouter.post('/', syncController.runNow);