import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { priceController } from '../prices/controller';
import { cryptoController } from './controller';

export const cryptoRouter = Router();

cryptoRouter.use(authMiddleware);

cryptoRouter.get('/', cryptoController.list);
cryptoRouter.post('/', cryptoController.create);
cryptoRouter.get('/:id', cryptoController.getById);
cryptoRouter.patch('/:id', cryptoController.update);
cryptoRouter.delete('/:id', cryptoController.delete);
cryptoRouter.get('/:id/prices', priceController.history);