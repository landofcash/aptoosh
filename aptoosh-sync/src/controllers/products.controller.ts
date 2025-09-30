import { Request, Response } from 'express';
import { sendJson } from '../utils/respond';
import { appDb } from '../cache';

export async function getProductsByWallet(req: Request, res: Response) {
  const { wallet } = req.params as { wallet: string };
  const products = await appDb.getProductsByWallet(wallet, req.network!);
  if (!products) {
    return sendJson(res, { success: false, error: `No products found for wallet "${wallet}"` }, 404);
  }
  sendJson(res, { success: true, data: products });
}
