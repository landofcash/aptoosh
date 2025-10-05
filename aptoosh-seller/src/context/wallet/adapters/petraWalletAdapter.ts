import type { WalletAdapter, NetworkId, EntryFunctionPayload } from "../types";
import type { PetraWalletProvider, AptosAccount } from "@/types/aptos-wallet";
import { hexToBytes, b64ToBytes } from "@/utils/encoding.ts";
import { mapNetworkName } from "@/lib/crypto/cryptoUtils.ts";
import { getAptosClient } from "@/lib/aptos/aptosClient.ts";
import {APP_KEY_PREFIX, getCurrentConfig, isMobileWeb} from "@/config.ts";
import { startConnect, startSignAndSubmit, startSignMessage } from "@/lib/wallet/deepLinkBridge";


function provider(): PetraWalletProvider | null {
  return window?.aptos ?? null;
}

function hasInjectedPetra(): boolean {
  const p = window?.aptos;
  return !!(p);
}

export const petraWalletAdapter: WalletAdapter = {
  chain: 'aptos',
  name: 'Petra Wallet',
  id: 'petra',

  isInstalled() {
    if (hasInjectedPetra()) return true;
    // On mobile, we support Petra via deep links
    return isMobileWeb();
  },

  async getAddress() {
    const p = provider();
    if (p?.account) {
      try {
        const a = await p.account();
        return a?.address ?? null;
      } catch {
        return null;
      }
    }
    // Deep-link mode: return last known address if any
    try {
      const addr = localStorage.getItem(`${APP_KEY_PREFIX}-petra:last_address`);
      return addr || null;
    } catch {
      return null;
    }
  },

  async getNetwork(): Promise<NetworkId | null> {
    const p = provider();
    if (p?.network) {
      try {
        const n = await p.network();
        if (!n) return null;
        return mapNetworkName(n.name);
      } catch {
        return null;
      }
    }
    // Deep-link mode: return current app network
    try {
      return (getCurrentConfig().name as NetworkId)
        || (localStorage.getItem(`${APP_KEY_PREFIX}-network`) as NetworkId) || 'testnet';
    } catch {
      return 'testnet';
    }
  },

  async connect(opts?: { silent?: boolean }) {
    const p = provider();
    const injected = !!(p && p.connect);
    if (injected) {
      await p!.connect({ onlyIfTrusted: !!opts?.silent });
      const a = await p!.account();
      const addr = a?.address ?? null;
      if (addr) localStorage.setItem(`${APP_KEY_PREFIX}-petra:last_address`, addr);
      return addr;
    }
    // Deep-link mode
    if (opts?.silent) {
      // Do not navigate. Just return the last known address if any.
      const addr = localStorage.getItem(`${APP_KEY_PREFIX}-petra:last_address`);
      return addr || null;
    }
    const address = await startConnect();
    if (address) localStorage.setItem(`${APP_KEY_PREFIX}-petra:last_address`, address);
    return address;
  },

  async disconnect() {
    const p = provider();
    if (p?.disconnect) await p.disconnect();
    try { localStorage.removeItem(`${APP_KEY_PREFIX}-petra:last_address`); } catch {
      // Ignore errors
    }
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
    if (p?.signMessage) {
      const res = await p.signMessage({ message: dataToSign, nonce: '-' });
      return typeof res.signature === 'string' ? hexToBytes(res.signature) : res.signature;
    }
    // Deep-link mode: returns signature string (hex or base64)
    const sigStr = await startSignMessage(dataToSign);
    // Try hex first, fallback to base64
    try {
      return hexToBytes(sigStr);
    } catch {
      return b64ToBytes(sigStr);
    }
  },

  async signAndSubmit(payload: EntryFunctionPayload): Promise<{ hash: string }> {
    const p = provider();
    if (p?.signAndSubmitTransaction) {
      const tx = {
        type: 'entry_function_payload',
        function: payload.function,
        type_arguments: payload.type_arguments ?? [],
        arguments: payload.arguments,
      } as const;
      const response = await p.signAndSubmitTransaction(tx);
      const aptos = getAptosClient();
      try {
        await aptos.waitForTransaction({ transactionHash: response.hash });
      } catch (error) {
        console.error(error);
      }
      return { hash: response.hash };
    }
    // Deep-link mode
    const hash = await startSignAndSubmit(payload);
    const aptos = getAptosClient();
    try {
      await aptos.waitForTransaction({ transactionHash: hash });
    } catch (error) {
      console.error(error);
    }
    return { hash };
  }
};
