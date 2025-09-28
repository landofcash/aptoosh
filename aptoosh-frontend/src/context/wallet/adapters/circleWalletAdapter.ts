import {getCurrentConfig, CIRCLE_APP_ID, CIRCLE_BASE_URL} from '@/config';
import type {EntryFunctionPayload, NetworkId, WalletAdapter} from '../types';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';

type CircleWallet = { walletId: string };
type CircleWalletListResponse = { data: { wallets: CircleWallet[] } };
type CircleAddress = { walletId: string; address: string; blockchain: string };
type CircleAddressListResponse = { data: { addresses: CircleAddress[] } };
type CircleSignatureResponse = { data: { signature: string | Uint8Array | number[] } };
type CircleTransactionResponse = { data: { transactionHash?: string; hash?: string; id?: string } };

type AccountChangeCallback = (address: string | null) => void;

const STORAGE_KEY = 'circle.wallet.id';

let clientPromise: Promise<W3SSdk> | null = null;
let activeWalletId: string | null = null;
let activeAddress: string | null = null;
const accountSubscribers = new Set<AccountChangeCallback>();

function getStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Circle adapter cannot access localStorage:', error);
    return undefined;
  }
}

function loadPersistedWalletId(): string | null {
  return getStorage()?.getItem(STORAGE_KEY) ?? null;
}

function persistWalletId(id: string) {
  getStorage()?.setItem(STORAGE_KEY, id);
}

function clearPersistedWalletId() {
  getStorage()?.removeItem(STORAGE_KEY);
}

function notifyAccount(address: string | null) {
  for (const subscriber of accountSubscribers) {
    try {
      subscriber(address);
    } catch (error) {
      console.error('Circle wallet subscriber threw:', error);
    }
  }
}

async function getClient(): Promise<W3SSdk> {
  if (!clientPromise) {
    const appId = CIRCLE_APP_ID;
    // Initialize Circle Web SDK. It expects configs with appSettings.appId. Environment/baseUrl are used by backend flows.
    const configs: any = {};
    if (appId) configs.appSettings = { appId };
    const client = new W3SSdk(configs as any);
    clientPromise = Promise.resolve(client as unknown as W3SSdk);
  }
  return clientPromise;
}

async function listWallets(client: W3SSdk): Promise<CircleWallet[]> {
  const response = await (client as any)?.wallets?.listWallets?.() as CircleWalletListResponse;
  const wallets = response?.data?.wallets ?? [];
  if (!wallets.length) throw new Error('Circle account has no wallets');
  return wallets;
}

async function getWalletAddresses(client: W3SSdk, walletId: string): Promise<CircleAddressListResponse> {
  return await (client as any)?.addresses?.listAddresses?.({ walletId }) as CircleAddressListResponse;
}

async function selectWallet(client: W3SSdk): Promise<CircleWallet> {
  const wallets = await listWallets(client);
  const persistedId = activeWalletId ?? loadPersistedWalletId();
  if (persistedId) {
    const match = wallets.find(wallet => wallet.walletId === persistedId);
    if (match) return match;
  }
  return wallets[0]!;
}

async function resolveAptosAddress(client: W3SSdk, walletId: string): Promise<string> {
  const addressResponse = await getWalletAddresses(client, walletId);
  const addresses = addressResponse?.data?.addresses ?? [];
  const aptosAddress = addresses.find(addr => addr.blockchain === 'APTOS');
  if (!aptosAddress) throw new Error('Circle wallet does not contain an Aptos address');
  return aptosAddress.address;
}

async function ensureActiveWallet(): Promise<{ walletId: string; address: string }> {
  if (activeWalletId && activeAddress) return {walletId: activeWalletId, address: activeAddress};
  const persistedId = activeWalletId ?? loadPersistedWalletId();
  if (!persistedId) throw new Error('No Circle wallet connected');
  const client = await getClient();
  const address = await resolveAptosAddress(client, persistedId);
  activeWalletId = persistedId;
  activeAddress = address;
  return {walletId: persistedId, address};
}

export const circleWalletAdapter: WalletAdapter = {
  chain: 'aptos',
  name: 'Circle Wallet',
  id: 'circle',

  isInstalled() {
    return Boolean(CIRCLE_APP_ID || CIRCLE_BASE_URL);
  },

  async getAddress(): Promise<string | null> {
    if (activeAddress) return activeAddress;
    const persistedId = activeWalletId ?? loadPersistedWalletId();
    if (!persistedId) return null;
    const client = await getClient();
    const address = await resolveAptosAddress(client, persistedId);
    activeWalletId = persistedId;
    activeAddress = address;
    return address;
  },

  async getNetwork(): Promise<NetworkId | null> {
    return (getCurrentConfig().name as NetworkId) ?? null;
  },

  async connect(): Promise<string | null> {
    const client = await getClient();
    await client.auth.getUserToken();

    const wallet = await selectWallet(client);
    const address = await resolveAptosAddress(client, wallet.walletId);

    activeWalletId = wallet.walletId;
    activeAddress = address;
    persistWalletId(wallet.walletId);
    notifyAccount(address);
    return address;
  },

  async disconnect(): Promise<void> {
    if (clientPromise) {
      const client = await getClient();
      const anyClient = client as any;
      if (typeof anyClient?.auth?.logout === 'function') {
        await anyClient.auth.logout();
      }
    }

    activeWalletId = null;
    activeAddress = null;
    clearPersistedWalletId();
    notifyAccount(null);
  },

  onAccountChange(callback: AccountChangeCallback) {
    accountSubscribers.add(callback);
    return () => {
      accountSubscribers.delete(callback);
    };
  },

  async signMessage(dataToSign: string): Promise<Uint8Array> {
    const client = await getClient();
    const { walletId } = await ensureActiveWallet();
    const anyClient = client as any;
    const response = await anyClient?.signatures?.createSignature?.({
      walletId,
      unsignedMessage: dataToSign,
    }) as CircleSignatureResponse;
    const signature = response?.data?.signature;
    if (signature instanceof Uint8Array) return signature;
    if (Array.isArray(signature)) return Uint8Array.from(signature);
    if (typeof signature === 'string') return stringToBytes(signature);
    throw new Error('Circle signature response missing byte payload');
  },

  async signAndSubmit(payload: EntryFunctionPayload): Promise<{ hash: string }> {
    const client = await getClient();
    const { walletId } = await ensureActiveWallet();
    const network = getCurrentConfig().name;
    const anyClient = client as any;
    const response = await anyClient?.transactions?.createTransaction?.({
      walletId,
      payload,
      network,
    }) as CircleTransactionResponse;
    const hash = response?.data?.transactionHash ?? response?.data?.hash ?? response?.data?.id;
    if (!hash) throw new Error('Circle transaction response missing hash');
    return { hash };
  },
};

function stringToBytes(input: string): Uint8Array {
  // Try hex with optional 0x prefix
  const hex = input.startsWith('0x') ? input.slice(2) : input;
  if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return out;
  }
  // Fallback to UTF-8 bytes
  return new TextEncoder().encode(input);
}
