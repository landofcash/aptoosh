import express from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireWalletParam } from '../../middleware/validators';
import { getProductsByWallet } from '../../controllers/products.controller';

const router = express.Router({ mergeParams: true });

// GET /api/v1/:network/products/:wallet
router.get('/:wallet', requireWalletParam, asyncHandler(getProductsByWallet));

export default router;
