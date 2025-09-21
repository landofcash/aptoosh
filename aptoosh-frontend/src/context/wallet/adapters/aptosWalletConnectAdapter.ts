import type {NetworkId, WalletAdapter, EntryFunctionPayload} from "../types";
import {getCurrentConfig} from "@/config.ts";
import SignClient from "@walletconnect/sign-client";
import {WalletConnectModal} from "@walletconnect/modal";

// Minimal session typing we use from WalletConnect
interface WalletConnectSession {
  topic: string;
  namespaces?: {
    aptos?: {
      accounts?: string[];
    };
  };
}

interface SessionEventPayload {
  topic: string;
  params?: {
    event?: { name?: string };
    chainId?: string;
  };
}

let signClient: Awaited<ReturnType<typeof SignClient.init>> | null = null;
let modal: WalletConnectModal | null = null;
let connectedSession: WalletConnectSession | null = null;
let connectedAddress: string | null = null;
let currentNetwork: NetworkId | null = null;

// Subscribers for reactive updates
const accountSubscribers: Array<(addr: string | null) => void> = [];
const networkSubscribers: Array<(net: NetworkId | null) => void> = [];

function emitAccount(addr: string | null) {
  for (const cb of accountSubscribers) try {
    cb(addr);
  } catch (e) {
    console.error('AptosWalletConnectAdapter emitAccount error:', e);
  }
}

function emitNetwork(net: NetworkId | null) {
  for (const cb of networkSubscribers) try {
    cb(net);
  } catch (e) {
    console.error('AptosWalletConnectAdapter emitNetwork error:', e);
  }
}

function aptosChainsFor(network: NetworkId | null) {
  const n = network ?? "testnet";
  return [`aptos:${n}`];
}

function extractAddressFromSession(session: WalletConnectSession): string | null {
  const accounts: string[] | undefined = session?.namespaces?.aptos?.accounts;
  if (!accounts?.length) return null;
  const first = accounts[0];
  const parts = first.split(":");
  return parts[2] ?? null;
}

async function ensureClient(projectId: string) {
  if (!signClient) {
    signClient = await SignClient.init({projectId});
  }
  if (!modal) {
    modal = new WalletConnectModal({
      projectId,
      themeMode: "light",
    });
  }
}

export function createAptosWalletConnectAdapter(): WalletAdapter {
  const walletConnectProjectId = getCurrentConfig().walletConnectProjectId;
  currentNetwork = getCurrentConfig().name;

  // Keep the currentNetwork in sync with app-level selection via localStorage changes
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (ev) => {
      if (ev.key === 'network') {
        currentNetwork = (ev.newValue as NetworkId) || currentNetwork;
        emitNetwork(currentNetwork);
      }
    });
  }

  return {
    chain: 'aptos',
    name: 'WalletConnect',
    id: 'walletconnect',

    isInstalled() {
      // Available only when WC project id is configured
      return !!walletConnectProjectId;
    },

    async getAddress() {
      return connectedAddress;
    },

    async getNetwork() {
      return currentNetwork;
    },

    async connect(opts?: { silent?: boolean }) {
      if (!walletConnectProjectId) throw new Error('WalletConnect projectId is not configured');
      await ensureClient(walletConnectProjectId);

      // If we already have a session, reuse it
      if (connectedSession) {
        connectedAddress = extractAddressFromSession(connectedSession);
        return connectedAddress;
      }

      if (opts?.silent) return null;

      const requiredNamespaces = {
        aptos: {
          methods: [
            'aptos_signMessage',
            'aptos_signTransaction',
            'aptos_signAndSubmitTransaction',
          ],
          chains: aptosChainsFor(currentNetwork),
          events: ['accountsChanged', 'networkChanged'],
        },
      };

      const {uri, approval} = await signClient!.connect({
        requiredNamespaces,
      });

      if (uri) {
        await modal!.openModal({uri});
      }

      try {
        connectedSession = await approval();
      } finally {
        modal!.closeModal();
      }

      connectedAddress = extractAddressFromSession(connectedSession);
      emitAccount(connectedAddress);
      emitNetwork(currentNetwork);

      // Wire session update/delete events once
      signClient!.on('session_update', ({topic, params}) => {
        if (!connectedSession || connectedSession.topic !== topic) return;
        connectedSession = {...connectedSession, namespaces: params.namespaces};
        connectedAddress = extractAddressFromSession(connectedSession);
        emitAccount(connectedAddress);
      });

      // Receive account/network changes from wallets
      signClient!.on('session_event', (payload: SessionEventPayload) => {
        const {topic, params} = payload;
        if (!connectedSession || connectedSession.topic !== topic) return;
        const name = params?.event?.name;
        const chainId = params?.chainId;
        if (name === 'accountsChanged') {
          // Re-extract from the session
          connectedAddress = extractAddressFromSession(connectedSession);
          emitAccount(connectedAddress);
        }
        if (name === 'networkChanged' && chainId && chainId.startsWith('aptos:')) {
          currentNetwork = chainId.split(':')[1] as NetworkId;
          emitNetwork(currentNetwork);
        }
      });

      signClient!.on('session_delete', ({topic}) => {
        if (connectedSession && connectedSession.topic === topic) {
          connectedSession = null;
          connectedAddress = null;
          emitAccount(null);
        }
      });

      return connectedAddress;
    },

    async disconnect() {
      try {
        if (signClient && connectedSession) {
          await signClient.disconnect({
            topic: connectedSession.topic,
            reason: {code: 6000, message: 'User disconnected'}
          });
        }
      } catch (e) {
        console.error('AptosWalletConnectAdapter disconnect error:', e);
      }
      connectedSession = null;
      connectedAddress = null;
    },

    async signMessage(dataToSign: string, message?: string): Promise<Uint8Array> {
      if (!signClient) throw new Error('WalletConnect client not initialized');
      if (!connectedSession) throw new Error('Not connected');
      const topic = connectedSession.topic;
      const chainId = `aptos:${currentNetwork ?? 'testnet'}`;

      const params = {
        message: message ?? dataToSign,
        nonce: '-',
      } as const;

      const res: any = await signClient.request({
        topic,
        chainId,
        request: {
          method: 'aptos_signMessage',
          params,
        },
      });

      const sig = res?.signature ?? res;
      if (typeof sig === 'string') {
        const hex = sig.startsWith('0x') ? sig.slice(2) : sig;
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
        return bytes;
      }
      if (sig instanceof Uint8Array) return sig;
      throw new Error('WalletConnect signMessage: unexpected response');
    },

    async signAndSubmit(payload: EntryFunctionPayload): Promise<{ hash: string }> {
      if (!signClient) throw new Error('WalletConnect client not initialized');
      if (!connectedSession) throw new Error('Not connected');
      const topic = connectedSession.topic;
      const chainId = `aptos:${currentNetwork ?? 'testnet'}`;

      const tx = {
        type: 'entry_function_payload',
        function: payload.function,
        type_arguments: payload.type_arguments ?? [],
        arguments: payload.arguments,
      } as const;

      const resp: any = await signClient.request({
        topic,
        chainId,
        request: {
          method: 'aptos_signAndSubmitTransaction',
          params: tx,
        },
      });

      const hash = resp?.result?.hash ?? resp?.hash ?? (typeof resp === 'string' ? resp : null);
      if (!hash || typeof hash !== 'string') {
        throw new Error('WalletConnect signAndSubmit: unexpected response');
      }
      return { hash };
    },

    onAccountChange(cb) {
      accountSubscribers.push(cb);
      // Fire immediately with the current state
      try {
        cb(connectedAddress);
      } catch (e) {
        console.error('AptosWalletConnectAdapter onAccountChange callback error:', e);
      }
      return () => {
        const idx = accountSubscribers.indexOf(cb);
        if (idx >= 0) accountSubscribers.splice(idx, 1);
      };
    },

    onNetworkChange(cb) {
      networkSubscribers.push(cb);
      try {
        cb(currentNetwork ?? null);
      } catch (e) {
        console.error('AptosWalletConnectAdapter onNetworkChange callback error:', e);
      }
      return () => {
        const idx = networkSubscribers.indexOf(cb);
        if (idx >= 0) networkSubscribers.splice(idx, 1);
      };
    },
  };
}
