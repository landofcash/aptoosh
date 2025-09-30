import {getCurrentConfig, CIRCLE_APP_ID, getCircleApiBaseUrl} from '@/config';
import type {EntryFunctionPayload, NetworkId, WalletAdapter} from '../types';
import {W3SSdk} from '@circle-fin/w3s-pw-web-sdk';
import {
  createUser,
  createUserToken,
  pinWithWallets,
  verifyPinChallenge,
  getChallengeStatus,
} from '@/lib/circle/api';
import {encryptPin} from '@/lib/circle/pin';
import {
  clearState,
  getStoredToken,
  getStoredUserId,
  getStoredWalletId,
  setStoredToken,
  setStoredUserId,
  setStoredWalletId,
} from '@/lib/circle/storage';

interface CircleWalletSummary {
  walletId: string;
}
interface CircleWalletListResponse { data?: { wallets?: CircleWalletSummary[] } }
interface CircleAddressSummary { walletId: string; address: string; blockchain: string }
interface CircleAddressListResponse { data?: { addresses?: CircleAddressSummary[] } }
interface CircleSignatureResponse { data?: { signature?: string | Uint8Array | number[] } }
interface CircleTransactionResponse { data?: { transactionHash?: string; hash?: string; id?: string } }

type AccountChangeCallback = (address: string | null) => void;

type ConnectOpts = { silent?: boolean };

let clientPromise: Promise<W3SSdk> | null = null;
let activeWalletId: string | null = null;
let activeAddress: string | null = null;
const accountSubscribers = new Set<AccountChangeCallback>();

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
    const configs: any = {};
    if (CIRCLE_APP_ID) configs.appSettings = {appId: CIRCLE_APP_ID};
    clientPromise = Promise.resolve(new W3SSdk(configs as any));
  }
  return clientPromise;
}

function resolveCircleBlockchain(network: NetworkId): string {
  if (network === 'mainnet') return 'APTOS';
  if (network === 'testnet') return 'APTOS-TESTNET';
  if (network === 'devnet') return 'APTOS-TESTNET';
  return 'APTOS-TESTNET';
}

function ensurePin(pin: string | null): string {
  if (!pin) throw new Error('Circle PIN setup cancelled');
  const trimmed = pin.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    throw new Error('PIN must be 6 digits');
  }
  return trimmed;
}

function requestPinFromUser(): string {
  if (typeof window === 'undefined') {
    throw new Error('Circle PIN entry is only available in the browser');
  }
  const first = window.prompt('Create a 6-digit PIN for your Circle Wallet');
  const pin = ensurePin(first);
  const confirm = window.prompt('Confirm your Circle Wallet PIN');
  const confirmed = ensurePin(confirm);
  if (pin !== confirmed) {
    throw new Error('PIN confirmation does not match');
  }
  return pin;
}

async function listWallets(client: W3SSdk): Promise<CircleWalletSummary[]> {
  const response = await (client as any)?.wallets?.listWallets?.() as CircleWalletListResponse;
  return response?.data?.wallets ?? [];
}

async function getWalletAddresses(client: W3SSdk, walletId: string): Promise<CircleAddressSummary[]> {
  const response = await (client as any)?.addresses?.listAddresses?.({walletId}) as CircleAddressListResponse;
  return response?.data?.addresses ?? [];
}

async function resolveAptosAddress(client: W3SSdk, walletId: string): Promise<string> {
  const addresses = await getWalletAddresses(client, walletId);
  const aptos = addresses.find(addr => addr.blockchain === 'APTOS');
  if (!aptos) throw new Error('Circle wallet does not contain an Aptos address');
  return aptos.address;
}

async function wait(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForWalletProvision(client: W3SSdk, userToken: string, challengeId: string) {
  const maxAttempts = 20;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await wait(1500);
    const wallets = await listWallets(client);
    if (wallets.length > 0) return;
    try {
      const status = await getChallengeStatus(userToken, challengeId);
      const challengeStatus = status?.challenge?.status ?? status?.challenge?.currentStep ?? '';
      if (typeof challengeStatus === 'string' && challengeStatus.toUpperCase().includes('FAIL')) {
        throw new Error(`Circle challenge failed (${challengeStatus})`);
      }
    } catch (error) {
      console.warn('Circle challenge polling error:', error);
    }
  }
  throw new Error('Timed out waiting for Circle wallet provisioning');
}

async function provisionWallet(client: W3SSdk, userToken: string) {
  const cfg = getCurrentConfig();
  const blockchain = resolveCircleBlockchain(cfg.name as NetworkId);
  const challenge = await pinWithWallets({
    userToken,
    blockchains: [blockchain],
    metadata: [{name: 'Aptoosh Wallet'}],
  });
  const pin = requestPinFromUser();
  const encryptedPin = await encryptPin(pin);
  await verifyPinChallenge({userToken, challengeId: challenge.challengeId, encryptedPin});
  await waitForWalletProvision(client, userToken, challenge.challengeId);
}

async function ensureAuthentication(opts: ConnectOpts): Promise<{ client: W3SSdk; userId: string; userToken: string }> {
  const apiBase = getCircleApiBaseUrl();
  if (!apiBase) {
    if (opts.silent) {
      throw new Error('Circle API unavailable');
    }
    throw new Error('Circle API is not configured for this network');
  }

  let userId = getStoredUserId();
  if (!userId) {
    if (opts.silent) throw new Error('Circle user is not initialized');
    const user = await createUser();
    userId = user.userId ?? user.id;
    setStoredUserId(userId);
  }

  const now = Date.now();
  let tokenInfo = getStoredToken();
  if (!tokenInfo || tokenInfo.tokenExpiresAt - now < 60_000) {
    if (opts.silent && !tokenInfo) throw new Error('Circle user token missing');
    const response = await createUserToken(userId);
    const expiresIn = typeof response.expiresIn === 'number' ? response.expiresIn : 3600;
    const tokenExpiresAt = now + expiresIn * 1000;
    tokenInfo = {
      userToken: response.userToken,
      encryptionKey: response.encryptionKey,
      tokenExpiresAt,
    };
    setStoredToken(tokenInfo);
  }

  const client = await getClient();
  client.updateConfigs?.({
    appSettings: { appId: CIRCLE_APP_ID || '' },
    authentication: {
      userToken: tokenInfo.userToken,
      encryptionKey: tokenInfo.encryptionKey,
    },
  } as any);

  return {client, userId, userToken: tokenInfo.userToken};
}

async function ensureWallet(client: W3SSdk, userToken: string, opts: ConnectOpts): Promise<{ walletId: string; address: string } | null> {
  const persistedId = activeWalletId ?? getStoredWalletId();
  if (persistedId) {
    try {
      const address = await resolveAptosAddress(client, persistedId);
      activeWalletId = persistedId;
      activeAddress = address;
      return {walletId: persistedId, address};
    } catch (error) {
      console.warn('Circle wallet lookup failed, falling back to discovery:', error);
    }
  }

  let wallets: CircleWalletSummary[] = [];
  try {
    wallets = await listWallets(client);
  } catch (error) {
    console.warn('Circle listWallets failed:', error);
  }

  if (!wallets.length) {
    if (opts.silent) return null;
    await provisionWallet(client, userToken);
    wallets = await listWallets(client);
  }

  if (!wallets.length) {
    throw new Error('Circle account has no wallets');
  }

  const wallet = wallets[0]!;
  const address = await resolveAptosAddress(client, wallet.walletId);
  activeWalletId = wallet.walletId;
  activeAddress = address;
  setStoredWalletId(wallet.walletId);
  return {walletId: wallet.walletId, address};
}

async function ensureActive(opts: ConnectOpts): Promise<{ client: W3SSdk; walletId: string; address: string }> {
  const {client, userToken} = await ensureAuthentication(opts);
  const wallet = await ensureWallet(client, userToken, opts);
  if (!wallet) throw new Error('No Circle wallet connected');
  return {client, ...wallet};
}

function stringToBytes(input: string): Uint8Array {
  const hex = input.startsWith('0x') ? input.slice(2) : input;
  if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return out;
  }
  return new TextEncoder().encode(input);
}

export const circleWalletAdapter: WalletAdapter = {
  chain: 'aptos',
  name: 'Circle Wallet',
  id: 'circle',

  isInstalled() {
    return Boolean(CIRCLE_APP_ID || getCircleApiBaseUrl());
  },

  async getAddress(): Promise<string | null> {
    if (activeAddress) return activeAddress;
    const stored = activeWalletId ?? getStoredWalletId();
    if (!stored) return null;
    try {
      const {client} = await ensureAuthentication({silent: true});
      const address = await resolveAptosAddress(client, stored);
      activeWalletId = stored;
      activeAddress = address;
      return address;
    } catch (error) {
      console.warn('Circle getAddress failed:', error);
      return null;
    }
  },

  async getNetwork(): Promise<NetworkId | null> {
    return (getCurrentConfig().name as NetworkId) ?? null;
  },

  async connect(opts?: ConnectOpts): Promise<string | null> {
    const options = opts ?? {};
    try {
      const {address} = await ensureActive(options);
      notifyAccount(address);
      return address;
    } catch (error) {
      if (options.silent) {
        console.warn('Circle silent connect failed:', error);
        return null;
      }
      throw error;
    }
  },

  async disconnect(): Promise<void> {
    if (clientPromise) {
      const client = await getClient();
      const anyClient = client as any;
      if (typeof anyClient?.auth?.logout === 'function') {
        try {
          await anyClient.auth.logout();
        } catch (error) {
          console.warn('Circle logout failed:', error);
        }
      }
    }

    activeWalletId = null;
    activeAddress = null;
    setStoredWalletId(null);
    clearState(['userToken', 'tokenExpiresAt', 'encryptionKey']);
    notifyAccount(null);
  },

  onAccountChange(callback: AccountChangeCallback) {
    accountSubscribers.add(callback);
    return () => {
      accountSubscribers.delete(callback);
    };
  },

  async signMessage(dataToSign: string): Promise<Uint8Array> {
    const {client, walletId} = await ensureActive({silent: false});
    const response = await (client as any)?.signatures?.createSignature?.({
      walletId,
      unsignedMessage: dataToSign,
    }) as CircleSignatureResponse;
    const signature = response?.data?.signature;
    if (signature instanceof Uint8Array) return signature;
    if (Array.isArray(signature)) return Uint8Array.from(signature as number[]);
    if (typeof signature === 'string') return stringToBytes(signature);
    throw new Error('Circle signature response missing byte payload');
  },

  async signAndSubmit(payload: EntryFunctionPayload): Promise<{ hash: string }> {
    const {client, walletId} = await ensureActive({silent: false});
    const network = getCurrentConfig().name;
    const response = await (client as any)?.transactions?.createTransaction?.({
      walletId,
      payload,
      network,
    }) as CircleTransactionResponse;
    const hash = response?.data?.transactionHash ?? response?.data?.hash ?? response?.data?.id;
    if (!hash) throw new Error('Circle transaction response missing hash');
    return {hash};
  },
};
