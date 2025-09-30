import { Request, Response } from 'express';
import { sendJson } from '../utils/respond';
import { appDb } from '../cache';
import { ApiResponse } from '../types/types';

export async function listWallets(req: Request, res: Response) {
  const network = req.network!;
  const allProducts = await appDb.getAllProducts(network);
  const walletSummary = allProducts.map(store => ({
    wallet: store.shopWallet,
    productCount: store.products.length,
  }));
  const response: ApiResponse<any> = { success: true, data: walletSummary };
  sendJson(res, response);
}
