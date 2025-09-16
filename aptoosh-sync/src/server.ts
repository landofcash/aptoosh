import express, {Request, Response} from 'express';
import cors from 'cors';
import {appDb} from './cache';
import {ApiResponse} from './types';
import { triggerAptosSyncTick, getAptosLastRunTime } from './aptosSync';
import { config } from './config';
import uploadToBunnyRouter from './upload-to-bunny';

// Track when the server started
const startTime = new Date();

function safeJsonResponse(res: Response, body: any) {
  const safe = JSON.stringify(body, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
  res.setHeader('Content-Type', 'application/json');
  res.send(safe);
}

/**
 * Configure and start the Express server
 * @param port - The port to listen on
 * @returns A promise that resolves to the actual port the server is listening to
 */
export async function startServer(port: number): Promise<number> {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check endpoint with detailed cache information
  app.get('/', async (_req: Request, res: Response) => {
    try {
      const networks = config.getAllConfigs(); // Aptos active network

      const currentTime = new Date();
      const uptimeMs = currentTime.getTime() - startTime.getTime();
      const uptimeSeconds = Math.floor(uptimeMs / 1000);
      const uptimeMinutes = Math.floor(uptimeSeconds / 60);
      const uptimeHours = Math.floor(uptimeMinutes / 60);
      const uptimeDays = Math.floor(uptimeHours / 24);

      let uptimeString = '';
      if (uptimeDays > 0) uptimeString += `${uptimeDays}d `;
      if (uptimeHours % 24 > 0) uptimeString += `${uptimeHours % 24}h `;
      if (uptimeMinutes % 60 > 0) uptimeString += `${uptimeMinutes % 60}m `;
      uptimeString += `${uptimeSeconds % 60}s`;

      const lastRunTime = getAptosLastRunTime();

      const networkStats: Record<string, {
        stores: number;
        products: number;
        orders: number;
      }> = {};

      let totalStores = 0;
      let totalProducts = 0;
      let totalOrders = 0;

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

        networkStats[network] = {
          stores: storeCount,
          products: productCount,
          orders: orderCount
        };
      }

      const cacheStats = {
        startTime: startTime.toISOString(),
        uptime: uptimeString,
        uptimeMs,
        lastRunTime: lastRunTime ? lastRunTime.toISOString() : null,
        totalStores,
        totalProducts,
        totalOrders,
        networkStats
      };

      const response: ApiResponse<typeof cacheStats> = {
        success: true,
        data: cacheStats
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: `Failed to fetch cache statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      res.status(500).json(response);
    }
  });


  // Force sync endpoint
  app.post('/sync', async (_req: Request, res: Response) => {
    try {
      console.log('Manual Aptos sync tick triggered via API');
      await triggerAptosSyncTick();

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: {message: 'Aptos sync tick completed successfully'}
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: `Failed to sync products: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      res.status(500).json(response);
    }
  });

  app.use('/api/cdn', uploadToBunnyRouter);
  // API routes
  app.use('/api/:network', createApiRouter());

  // Initialize the database
  await appDb.initialize();

  // Start the server
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      resolve(actualPort);
    });
  });
}

/**
 * Create the API router with all endpoints
 * @returns An Express Router instance
 */
function createApiRouter() {
  const router = express.Router({mergeParams: true});

  function validateNetworkParam(req: Request, res: Response): string | null {
    const {network} = req.params;
    if (network === 'd') return 'devnet';
    if (network === 't') return 'testnet';
    if (network === 'm') return 'mainnet';
    res.status(400).json({success: false, error: 'Invalid network: must be "t" or "m"'});
    return null;
  }

  // Get the list of wallets and their product counts
  router.get('/wallets', async (req: Request, res: Response) => {
    const network = validateNetworkParam(req, res);
    if (!network) return;

    try {
      const allProducts = await appDb.getAllProducts(network);
      const walletSummary = allProducts.map(store => ({
        wallet: store.shopWallet,
        productCount: store.products.length
      }));

      const response: ApiResponse<any> = {
        success: true,
        data: walletSummary
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: `Failed to fetch wallet list: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      res.status(500).json(response);
    }
  });

  // Get products by wallet address
  router.get('/products/:wallet', async (req: Request, res: Response) => {
    const {wallet} = req.params;
    const network = validateNetworkParam(req, res);
    if (!network) return;

    if (!wallet) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Wallet address is required'
      };
      return res.status(400).json(response);
    }

    try {
      const products = await appDb.getProductsByWallet(wallet, network);

      if (!products) {
        const response: ApiResponse<null> = {
          success: false,
          error: `No products found for wallet "${wallet}"`
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse<any> = {
        success: true,
        data: products
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: `Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      res.status(500).json(response);
    }
  });

  // Get orders by buyer wallet address
  router.get('/orders/buyer/:wallet', async (req: Request, res: Response) => {
    const {wallet} = req.params;
    const network = validateNetworkParam(req, res);
    if (!network) return;

    if (!wallet) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Wallet address is required'
      };
      return res.status(400).json(response);
    }

    try {
      const orders = await appDb.getOrdersByWallet(wallet, network);

      if (!orders) {
        const response: ApiResponse<null> = {
          success: false,
          error: `No orders found for wallet "${wallet}"`
        };
        return res.status(404).json(response);
      }

      safeJsonResponse(res, {
        success: true,
        data: orders
      });
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: `Failed to fetch orders: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      res.status(500).json(response);
    }
  });

  // Get orders by seller wallet address
  router.get('/orders/seller/:wallet', async (req: Request, res: Response) => {
    const {wallet} = req.params;
    const network = validateNetworkParam(req, res);
    if (!network) return;

    if (!wallet) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Wallet address is required'
      };
      return res.status(400).json(response);
    }

    try {
      const allOrders = await appDb.getAllOrders(network);
      const sellerOrders = allOrders.filter(store =>
        store.orders.some(order => order.sellerWallet === wallet)
      ).map(store => ({
        ...store,
        orders: store.orders.filter(order => order.sellerWallet === wallet)
      })).filter(store => store.orders.length > 0);

      if (sellerOrders.length === 0) {
        const response: ApiResponse<null> = {
          success: false,
          error: `No orders found for seller wallet "${wallet}"`
        };
        return res.status(404).json(response);
      }

      safeJsonResponse(res, {
        success: true,
        data: sellerOrders
      });

    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: `Failed to fetch orders: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      res.status(500).json(response);
    }
  });

  return router;
}
