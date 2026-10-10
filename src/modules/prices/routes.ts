import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { priceController } from './controller';

export const pricesRouter = Router();

pricesRouter.use(authMiddleware);

pricesRouter.get('/latest', priceController.latest);