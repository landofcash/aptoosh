import type { WalletAdapter, NetworkId, EntryFunctionPayload } from "../types";
import type { PetraWalletProvider, AptosAccount } from "@/types/aptos-wallet";
import {hexToBytes} from "@/utils/encoding.ts";
import {mapNetworkName} from "@/lib/crypto/cryptoUtils.ts";
import {getAptosClient} from "@/lib/aptos/aptosClient.ts";


function provider(): PetraWalletProvider | null {
  return window?.aptos ?? null; // Petra-compatible
}

export const petraWalletAdapter: WalletAdapter = {
  chain: 'aptos',
  name: 'Petra Wallet',
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
      if (!n) return null;
      return mapNetworkName(n.name);
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
    p.onAccountChange((acc: AptosAccount | null) => cb(acc?.address ?? null));
    return () => p?.off?.('accountChange');
  },

  onNetworkChange(cb) {
    const p = provider();
    if (!p?.onNetworkChange) return () => {};
    p.onNetworkChange((n) => {
      if (!n) return;
      cb(mapNetworkName(n.name))
    });
    return () => p?.off?.('networkChange');
  },

  async signMessage(dataToSign: string): Promise<Uint8Array> {
    const p = provider();
    if (!p?.signMessage) throw new Error('Aptos wallet does not support signMessage');
    const res = await p.signMessage({
      message: dataToSign,
      nonce: '-',
    });
    return typeof res.signature === 'string' ? hexToBytes(res.signature) : res.signature;
  },

  async signAndSubmit(payload: EntryFunctionPayload): Promise<{ hash: string }> {
    const p = provider();
    if (!p) throw new Error('No Aptos wallet provider (Petra) found');

    const tx = {
      type: 'entry_function_payload',
      function: payload.function,
      type_arguments: payload.type_arguments ?? [],
      arguments: payload.arguments,
    };

    const response = await p.signAndSubmitTransaction(tx);
    const aptos = getAptosClient();
    try {
      await aptos.waitForTransaction({ transactionHash: response.hash });
    } catch (error) {
      console.error(error);
    }
    return { hash: response.hash };
  }
};
