import express from 'express';
import { networkParam } from '../middleware/network';
import walletsRouter from './api/wallets.routes';
import productsRouter from './api/products.routes';
import ordersRouter from './api/orders.routes';

const router = express.Router({ mergeParams: true });
router.param('network', networkParam);

router.use('/wallets', walletsRouter);
router.use('/products', productsRouter);
router.use('/orders', ordersRouter);

export default router;
