import type {WalletAdapter, NetworkId, EntryFunctionPayload} from "../types";
import type {PontemWalletProvider} from "@/types/aptos-wallet";
import {hexToBytes} from "@/utils/encoding.ts";
import {mapNetworkName} from "@/lib/crypto/cryptoUtils.ts";
import {getCurrentConfig} from "@/config.ts";

function provider(): PontemWalletProvider | null {
  if (window?.pontem) return window.pontem;
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

  async getAddress():Promise<string | null> {
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
      if (!n) return null;
      return mapNetworkName(n.name);
    } catch {
      return null;
    }
  },

  async connect(opts?: { silent?: boolean }) {
    const p = provider();
    if (!p?.connect) throw new Error('No Pontem wallet provider found');

    // Silent path: do not open any UI
    if (opts?.silent) {
      try {
        const a = await p.account?.();
        return a ?? null;
      } catch {
        return null;
      }
    }
    await p.connect({ onlyIfTrusted: false });
    const a = await p.account();
    return a ?? null;
  },

  async disconnect() {
    const p = provider();
    if (p?.disconnect) await p.disconnect();
  },

  onAccountChange(cb) {
    const p = provider();
    if (!p?.onAccountChange) return () => {
    };
    p.onAccountChange((acc: string | null) => cb(acc ?? null));
    return () => p?.off?.('accountChange');
  },

  onNetworkChange(cb) {
    const p = provider();
    if (!p?.onNetworkChange) return () => {
    };
    p.onNetworkChange((n) => {
      if (!n) return;
      console.log('network change', n);
      cb(mapNetworkName(n.name))
    });
    return () => p?.off?.('networkChange');
  },

  async signMessage(dataToSign: string): Promise<Uint8Array> {
    const p = provider();
    if (!p?.signMessage) throw new Error('Pontem wallet does not support signMessage');
    const res = await p.signMessage({
      message: dataToSign,
      nonce: '-',
    });
    return typeof res.signature === 'string' ? hexToBytes(res.signature) : res.signature;
  },

  async signAndSubmit(payload: EntryFunctionPayload): Promise<{ hash: string }> {
    const p = provider();
    if (!p?.signAndSubmit) throw new Error('Pontem wallet does not support signAndSubmit');


    const desired = (getCurrentConfig().name as NetworkId);

    const n = await p.network?.();
    if (n?.name) {
      const walletNet = mapNetworkName(n.name);
      if (walletNet && walletNet !== desired) {
        throw new Error(
          `Pontem wallet is connected to "${walletNet}" but the app is set to "${desired}". ` +
          `Please switch the network in Pontem and try again.`
        );
      }
    }

    const tx = {
      type: 'entry_function_payload',
      function: payload.function,
      type_arguments: payload.type_arguments ?? [],
      arguments: payload.arguments,
    };

    const resp = await p.signAndSubmit(tx);
    if (!resp?.result) throw new Error('Pontem returned no result');
    return { hash: resp.result.hash };
  },
};
