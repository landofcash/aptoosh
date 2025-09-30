import { Request, Response, NextFunction } from 'express';

export type Network = 'devnet' | 'testnet' | 'mainnet';

declare global {
  namespace Express {
    interface Request {
      network?: Network;
    }
  }
}

export function networkParam(req: Request, res: Response, next: NextFunction, value: string) {
  const map: Record<string, Network> = { d: 'devnet', t: 'testnet', m: 'mainnet' };
  const mapped = map[value];
  if (!mapped) return res.status(400).json({ success: false, error: 'Invalid network: use d|t|m' });
  req.network = mapped;
  next();
}
