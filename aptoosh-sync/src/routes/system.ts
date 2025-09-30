import express from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendJson } from '../utils/respond';
import { formatUptime } from '../utils/uptime';
import { config } from '../config';
import { appDb } from '../cache';
import { getAptosLastRunTime, triggerAptosSyncTick } from '../aptosSync';

const startTime = new Date();
const router = express.Router();

// Health endpoint
router.get('/', asyncHandler(async (req, res) => {
  const { uptimeMs, uptimeString } = formatUptime(startTime);
  const lastRunTime = getAptosLastRunTime();

  const basic = {
    startTime: startTime.toISOString(),
    uptime: uptimeString,
    uptimeMs,
    lastRunTime: lastRunTime ? lastRunTime.toISOString() : null,
  };

  if (req.query.verbose !== 'true') {
    return sendJson(res, { success: true, data: basic });
  }

  // Verbose stats per network (heavier)
  const networks = config.getAllConfigs();
  const networkStats: Record<string, { stores: number; products: number; orders: number }> = {};
  let totalStores = 0, totalProducts = 0, totalOrders = 0;

  for (const value of networks.values()) {
    const network = value.network;
    const products = await appDb.getAllProducts(network);
    const orders = await appDb.getAllOrders(network);

    const storeCount = products.length;
    const productCount = products.reduce((sum, store) => sum + store.products.length, 0);
    const orderCount = orders.reduce((sum, store) => sum + store.orders.length, 0);

    totalStores += storeCount;
    totalProducts += productCount;
    totalOrders += orderCount;

    networkStats[network] = { stores: storeCount, products: productCount, orders: orderCount };
  }

  const data = { ...basic, totalStores, totalProducts, totalOrders, networkStats };
  sendJson(res, { success: true, data });
}));

// Force sync endpoint
router.post('/sync', asyncHandler(async (_req, res) => {
  await triggerAptosSyncTick();
  sendJson(res, { success: true, data: { message: 'Aptos sync tick completed successfully' } });
}));

export default router;
