import type { WalletAdapter, NetworkId } from "../types";

function provider(): any | null {
  const w = window as any;
  // Prefer Pontem's own namespace if present
  if (w?.pontem) return w.pontem;
  // Some wallets also expose via the Aptos Wallet Standard under window.aptos
  const a = w?.aptos;
  if (!a) return null;
  if (a?.isPontem || a?.name === 'Pontem' || a?.provider?.name === 'Pontem') return a;
  return null;
}

export const pontemWalletAdapter: WalletAdapter = {
  chain: 'aptos',
  name: 'Pontem (browser)',
  id: 'pontem',

  isInstalled() {
    const p = provider();
    return !!(p && (p.isPontem || p.account || p.connect));
  },

  async getAddress() {
    const p = provider();
    if (!p?.account) return null;
    try {
      const a = await p.account();
      return a ?? null;
    } catch {
      return null;
    }
  },

  async getNetwork(): Promise<NetworkId | null> {
    const p = provider();
    if (!p?.network) return null;
    try {
      const n = await p.network();
      return (n?.name as NetworkId) ?? null;
    } catch {
      return null;
    }
  },

  async connect(opts?: { silent?: boolean }) {
    const p = provider();
    if (!p?.connect) throw new Error('No Pontem wallet provider found');
    await p.connect({ onlyIfTrusted: !!opts?.silent });
    const a = await p.account();
    return a ?? null;
  },

  async disconnect() {
    const p = provider();
    if (p?.disconnect) await p.disconnect();
  },

  onAccountChange(cb) {
    const p = provider();
    if (!p?.onAccountChange) return () => {};
    p.onAccountChange((acc: any) => cb(acc ?? null));
    return () => p?.off?.('accountChange');
  },

  onNetworkChange(cb) {
    const p = provider();
    if (!p?.onNetworkChange) return () => {};
    p.onNetworkChange((n: any) => cb(n?.name ?? null));
    return () => p?.off?.('networkChange');
  },

  async signMessage(dataToSign: string): Promise<Uint8Array> {
    const p = provider();
    if (!p?.signMessage) throw new Error('Pontem wallet does not support signMessage');
    const res = await p.signMessage({
      message: dataToSign,
      nonce: '-',
    });
    console.log("SignMessageResponse ",res);
    return res.signature;
  },
};
