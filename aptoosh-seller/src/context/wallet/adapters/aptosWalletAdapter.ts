import type { WalletAdapter, NetworkId } from "../types";

function provider(): any | null {
  return (window as any)?.aptos ?? null; // Petra-compatible
}

export const aptosWalletAdapter: WalletAdapter = {
  chain: 'aptos',
  name: 'Petra (browser)',
  id: 'petra',

  isInstalled() {
    const p = provider();
    return !!(p && (p.isPetra || p.account));
  },

  async getAddress() {
    const p = provider();
    if (!p?.account) return null;
    try {
      const a = await p.account();
      return a?.address ?? null;
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
    if (!p?.connect) throw new Error('No Aptos wallet provider found (e.g., Petra)');
    await p.connect({ onlyIfTrusted: !!opts?.silent });
    const a = await p.account();
    return a?.address ?? null;
  },

  async disconnect() {
    const p = provider();
    if (p?.disconnect) await p.disconnect();
  },

  onAccountChange(cb) {
    const p = provider();
    if (!p?.onAccountChange) return () => {};
    p.onAccountChange((acc: any) => cb(acc?.address ?? null));
    return () => p?.off?.('accountChange');
  },

  onNetworkChange(cb) {
    const p = provider();
    if (!p?.onNetworkChange) return () => {};
    p.onNetworkChange((n: any) => cb(n?.name ?? null));
    return () => p?.off?.('networkChange');
  },
};
