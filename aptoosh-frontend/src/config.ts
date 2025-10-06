import type {NetworkId} from "@/context/wallet/types.ts";
import isMobile from 'ismobilejs';

declare const __APP_VERSION__: string;
export const APP_VERSION = __APP_VERSION__
export const APP_NAME='Aptoosh'
export const BASE_URL='https://aptoosh.com'

// Sign prefix for encryption seed generation
export const signPrefix = "aptoosh-";
export const APP_KEY_PREFIX = 'Aptoosh';
const APTOS_EXPLORER_BASE = 'https://explorer.aptoslabs.com';

export const CIRCLE_APP_ID: string = 'a8986a00-6cbf-51f9-82ca-9945055526f6';

// Maximum size for order payload in bytes (2KB)
// while keeping transaction costs reasonable
export const MAX_ORDER_PAYLOAD_BYTES = 2048;

// Keep TokenConfig backward-compatible (numeric id) for current UI/helpers
export interface TokenConfig {
  id: number; // synthetic numeric id for UI (0 reserved for APT)
  name: string;
  decimals: number;
  img: string | null;
  // Optional Aptos coin type string for future use
  coinType: string;
}

export interface AptosEndpoints {
  nodeUrl: string; // Full node REST base URL (v1)
  indexerGraphqlUrl: string; // Indexer GraphQL endpoint
  indexerRestUrl?: string; // Optional alternative is indexer REST
  faucetUrl?: string; // Dev/test/local only
}

export interface NetworkConfig {
  cdnBasePath: string;
  name: NetworkId;
  account: string;
  apiUrl: string;
  fileApiUrl:string;
  circleApiUrl?: string | null;
  aptos: AptosEndpoints;
  explorerBaseUrl: string;
  approvedShopWallets: string[];
  supportedTokens: TokenConfig[];
  defaultGasUnitPrice?: number; // Octas per unit
  maxGasAmount?: number; // in gas units
}

const configs: Record<NetworkId, NetworkConfig> = {

  testnet: {
    name: 'testnet',
    account: '0x56397d22cd1f3ee037d59677e61ea72c6a11d73777705df4cd489a4dea83244d',
    apiUrl: 'https://sync.aptoosh.com/api/t',
    fileApiUrl: 'https://sync.aptoosh.com/api/cdn',
    circleApiUrl: 'https://sync.aptoosh.com/api/circle',
    cdnBasePath: 'https://aptoosh.b-cdn.net',
    aptos: {
      nodeUrl: 'https://fullnode.testnet.aptoslabs.com/v1',
      indexerGraphqlUrl: 'https://indexer.testnet.aptoslabs.com/v1/graphql',
      indexerRestUrl: 'https://indexer-testnet.staging.gcp.aptosdev.com/v1',
      faucetUrl: 'https://aptos.dev/network/faucet',
    },
    explorerBaseUrl: APTOS_EXPLORER_BASE,
    approvedShopWallets: [
      '0x179017d5a40740536702757576cd7253e510901cfb4d0a02f684b45430e5fa6d',
    ],
    supportedTokens: [
      { id: 0, name: 'APT', decimals: 8, img: null, coinType: '0x1::aptos_coin::AptosCoin' }
    ],
    defaultGasUnitPrice: 100,
    maxGasAmount: 200_000,
  },

  devnet: {
    name: 'devnet',
    account: '0xf2593c12647a63c213ed55e74763190adfcd8d95a8c14c9cdcf2258808e6eff5',
    apiUrl: 'https://sync.aptoosh.com/api/d',
    fileApiUrl: 'https://sync.aptoosh.com/api/cdn',
    circleApiUrl: 'http://localhost:3000/api/circle',
    cdnBasePath: 'https://aptoosh.b-cdn.net',
    aptos: {
      nodeUrl: 'https://fullnode.devnet.aptoslabs.com/v1',
      indexerGraphqlUrl: 'https://indexer.devnet.aptoslabs.com/v1/graphql',
      faucetUrl: 'https://faucet.devnet.aptoslabs.com',
    },
    explorerBaseUrl: APTOS_EXPLORER_BASE,
    approvedShopWallets: [
      '0x179017d5a40740536702757576cd7253e510901cfb4d0a02f684b45430e5fa6d',
    ],
    supportedTokens: [
      { id: 0, name: 'APT', decimals: 8, img:null, coinType: '0x1::aptos_coin::AptosCoin' }      
    ],
    defaultGasUnitPrice: 100,
    maxGasAmount: 200_000,
  }
};

export const getConfig = (network: NetworkId): NetworkConfig => configs[network];

// Returns all available network IDs from the configuration
export const getAvailableNetworkIds = (): NetworkId[] => Object.keys(configs) as NetworkId[];

export const getCurrentConfig = (): NetworkConfig => {
  const raw = (localStorage.getItem(`${APP_KEY_PREFIX}-network`) as NetworkId) || 'testnet';
  const available = getAvailableNetworkIds();
  const network: NetworkId = available.includes(raw) ? raw : (available[0] ?? 'testnet');
  return getConfig(network);
};

export const getCircleApiBaseUrl = (): string | null => {
  try {
    const cfg = getCurrentConfig();
    return cfg.circleApiUrl ?? null;
  } catch {
    return null;
  }
};

export const getNetworkIdFromQRCode = (value:string):NetworkId => {
  if(value==="2")return "testnet";
  if(value==="3")return "devnet";
  return "mainnet";
}

// Aptos Explorer helpers
export function explorerTxUrl(txHash: string, network?: NetworkId): string {
  const cfg = network ? getConfig(network) : getCurrentConfig();
  const n = cfg.name;
  const suffix = n === 'mainnet' ? '' : `?network=${n}`;
  return `${cfg.explorerBaseUrl}/txn/${txHash}${suffix}`;
}

export function explorerAccountUrl(address: string, network?: NetworkId): string {
  const cfg = network ? getConfig(network) : getCurrentConfig();
  const n = cfg.name;
  const suffix = n === 'mainnet' ? '' : `?network=${n}`;
  return `${cfg.explorerBaseUrl}/account/${address}${suffix}`;
}

export function explorerObjectUrl(objectAddress: string, network?: NetworkId): string {
  const cfg = network ? getConfig(network) : getCurrentConfig();
  const n = cfg.name;
  const suffix = n === 'mainnet' ? '' : `?network=${n}`;
  return `${cfg.explorerBaseUrl}/object/${objectAddress}${suffix}`;
}

export function isMobileWeb(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const { any } = isMobile(navigator.userAgent || '');
  return any;
}



