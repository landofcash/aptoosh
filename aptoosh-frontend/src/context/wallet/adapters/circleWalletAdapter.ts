import {getCurrentConfig} from '@/config';
import type {EntryFunctionPayload, NetworkId, WalletAdapter} from '../types';
import {createW3sClient} from '@circle-fin/w3s-pw-web-sdk';

type CircleW3sClient = ReturnType<typeof createW3sClient>;

type CircleWallet = { walletId: string };
type CircleWalletListResponse = { data: { wallets: CircleWallet[] } };
type CircleAddress = { walletId: string; address: string; blockchain: string };
type CircleAddressListResponse = { data: { addresses: CircleAddress[] } };
type CircleSignatureResponse = { data: { signature: Uint8Array | number[] } };
type CircleTransactionResponse = { data: { transactionHash?: string; hash?: string; id?: string } };

type AccountChangeCallback = (address: string | null) => void;

const STORAGE_KEY = 'circle.wallet.id';
const DEFAULT_ENVIRONMENT = 'sandbox';

let clientPromise: Promise<CircleW3sClient> | null = null;
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

async function getClient(): Promise<CircleW3sClient> {
  if (!clientPromise) {
    const environment = import.meta.env?.VITE_CIRCLE_ENVIRONMENT ?? DEFAULT_ENVIRONMENT;
    const appId = import.meta.env?.VITE_CIRCLE_APP_ID;
    const baseUrl = import.meta.env?.VITE_CIRCLE_BASE_URL;
    const options: Record<string, unknown> = {environment};
    if (appId) options.appId = appId;
    if (baseUrl) options.baseUrl = baseUrl;
    clientPromise = Promise.resolve(createW3sClient(options));
  }
  return clientPromise;
}

async function listWallets(client: CircleW3sClient): Promise<CircleWallet[]> {
  const response = await client.wallets.listWallets() as CircleWalletListResponse;
  const wallets = response?.data?.wallets ?? [];
  if (!wallets.length) throw new Error('Circle account has no wallets');
  return wallets;
}

async function getWalletAddresses(client: CircleW3sClient, walletId: string): Promise<CircleAddressListResponse> {
  return await client.addresses.listAddresses({walletId}) as CircleAddressListResponse;
}

async function selectWallet(client: CircleW3sClient): Promise<CircleWallet> {
  const wallets = await listWallets(client);
  const persistedId = activeWalletId ?? loadPersistedWalletId();
  if (persistedId) {
    const match = wallets.find(wallet => wallet.walletId === persistedId);
    if (match) return match;
  }
  return wallets[0]!;
}

async function resolveAptosAddress(client: CircleW3sClient, walletId: string): Promise<string> {
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

function isConfigured(): boolean {
  return Boolean(import.meta.env?.VITE_CIRCLE_APP_ID ?? import.meta.env?.VITE_CIRCLE_BASE_URL);
}

export const circleWalletAdapter: WalletAdapter = {
  chain: 'aptos',
  name: 'Circle Programmable Wallet',
  id: 'circle',

  isInstalled() {
    return isConfigured();
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
    if (typeof client.auth.getUserToken === 'function') {
      await client.auth.getUserToken();
    }

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
      if (typeof client.auth.logout === 'function') {
        await client.auth.logout();
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
    const {walletId} = await ensureActiveWallet();
    const response = await client.signatures.createSignature({
      walletId,
      unsignedMessage: dataToSign,
    }) as CircleSignatureResponse;
    const signature = response?.data?.signature;
    if (signature instanceof Uint8Array) return signature;
    if (Array.isArray(signature)) return Uint8Array.from(signature);
    throw new Error('Circle signature response missing byte payload');
  },

  async signAndSubmit(payload: EntryFunctionPayload): Promise<{ hash: string }> {
    const client = await getClient();
    const {walletId} = await ensureActiveWallet();
    const network = getCurrentConfig().name;
    const response = await client.transactions.createTransaction({
      walletId,
      payload,
      network,
    }) as CircleTransactionResponse;
    const hash = response?.data?.transactionHash ?? response?.data?.hash ?? response?.data?.id;
    if (!hash) throw new Error('Circle transaction response missing hash');
    return {hash};
  },
};

export const __TESTING__ = {
  reset() {
    clientPromise = null;
    activeWalletId = null;
    activeAddress = null;
    accountSubscribers.clear();
  },
  storageKey: STORAGE_KEY,
};
