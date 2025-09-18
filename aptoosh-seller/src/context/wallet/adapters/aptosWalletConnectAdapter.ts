import type { WalletAdapter, NetworkId } from "../types";
import { getCurrentConfig } from "@/config.ts";
import SignClient from "@walletconnect/sign-client";
import { WalletConnectModal } from "@walletconnect/modal";

let signClient: Awaited<ReturnType<typeof SignClient.init>> | null = null;
let modal: WalletConnectModal | null = null;
let connectedSession: any | null = null;
let connectedAddress: string | null = null;
let currentNetwork: NetworkId | null = null;

function aptosChainsFor(network: NetworkId | null) {
  const n = network ?? "testnet";
  return [`aptos:${n}`];
}

function extractAddressFromSession(session: any): string | null {
  const accounts: string[] | undefined = session?.namespaces?.aptos?.accounts;
  if (!accounts?.length) return null;
  const first = accounts[0];
  const parts = first.split(":");
  return parts[2] ?? null;
}

async function ensureClient(projectId: string) {
  if (!signClient) {
    signClient = await SignClient.init({ projectId });
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

  return {
    chain: 'aptos',
    name: 'WalletConnect (QR / mobile)',
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
          ] as string[],
          chains: aptosChainsFor(currentNetwork) as string[],
          events: ['accountsChanged', 'networkChanged'] as string[],
        },
      };

      const { uri, approval } = await signClient!.connect({
        requiredNamespaces: requiredNamespaces as any,
      });

      if (uri) {
        await modal!.openModal({ uri });
      }

      try {
        connectedSession = await approval();
      } finally {
        modal!.closeModal();
      }

      connectedAddress = extractAddressFromSession(connectedSession);

      // Wire session update/delete events once
      signClient!.on('session_update', ({ topic, params }) => {
        if (!connectedSession || connectedSession.topic !== topic) return;
        connectedSession = { ...connectedSession, namespaces: params.namespaces };
        connectedAddress = extractAddressFromSession(connectedSession);
      });

      signClient!.on('session_delete', ({ topic }) => {
        if (connectedSession && connectedSession.topic === topic) {
          connectedSession = null;
          connectedAddress = null;
        }
      });

      return connectedAddress;
    },

    async disconnect() {
      try {
        if (signClient && connectedSession) {
          await signClient.disconnect({ topic: connectedSession.topic, reason: { code: 6000, message: 'User disconnected' } });
        }
      } catch {}
      connectedSession = null;
      connectedAddress = null;
    },

    onAccountChange(cb) {
      // Polling-based emit to propagate updates to the app
      const interval = setInterval(() => cb(connectedAddress), 1000);
      return () => clearInterval(interval);
    },

    onNetworkChange(cb) {
      cb(currentNetwork ?? null);
      return () => {};
    },
  };
}
