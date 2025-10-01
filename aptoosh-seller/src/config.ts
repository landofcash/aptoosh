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


// Keep TokenConfig backward-compatible (numeric id) for current UI/helpers
export interface TokenConfig {
  id: number; // synthetic numeric id for UI (0 reserved for APT)
  name: string;
  decimals: number;
  img: string | null;
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
  aptos: AptosEndpoints;
  explorerBaseUrl: string; // https://explorer.aptoslabs.com
  approvedShopWallets: string[];
  supportedTokens: TokenConfig[];
  defaultGasUnitPrice?: number; // Octas per unit
  maxGasAmount?: number; // in gas units
}

const configs: Record<NetworkId, NetworkConfig> = {
  mainnet: {
    name: 'mainnet',
    account: '0x84171af48f266ba207890b75e78b503336c1cef911f693d65eb770da000f971f',
    apiUrl: 'https://sync.aptoosh.com/api/m',
    fileApiUrl: 'https://sync.aptoosh.com/api/cdn',
    cdnBasePath: 'https://aptoosh.b-cdn.net',
    aptos: {
      nodeUrl: 'https://fullnode.mainnet.aptoslabs.com/v1',
      indexerGraphqlUrl: 'https://indexer.mainnet.aptoslabs.com/v1/graphql',
      indexerRestUrl: 'https://indexer-mainnet.staging.gcp.aptosdev.com/v1',
    },
    explorerBaseUrl: APTOS_EXPLORER_BASE,
    approvedShopWallets: [],
    supportedTokens: [
      { id: 0, name: 'APT', decimals: 8, img:null, coinType: '0x1::aptos_coin::AptosCoin' },
      { id: 1,
        name: 'USDC', decimals: 6, img:null,
        coinType: '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b::asset::USDC' },
    ],
    defaultGasUnitPrice: 100,
    maxGasAmount: 200_000,
  },

  testnet: {
    name: 'testnet',
    account: '0x56397d22cd1f3ee037d59677e61ea72c6a11d73777705df4cd489a4dea83244d',
    apiUrl: 'https://sync.aptoosh.com/api/t',
    fileApiUrl: 'https://sync.aptoosh.com/api/cdn',
    cdnBasePath: 'https://aptoosh.b-cdn.net',
    aptos: {
      nodeUrl: 'https://fullnode.testnet.aptoslabs.com/v1',
      indexerGraphqlUrl: 'https://indexer.testnet.aptoslabs.com/v1/graphql',
      indexerRestUrl: 'https://indexer-testnet.staging.gcp.aptosdev.com/v1',
      faucetUrl: 'https://faucet.testnet.aptoslabs.com',
    },
    explorerBaseUrl: APTOS_EXPLORER_BASE,
    approvedShopWallets: [
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    ],
    supportedTokens: [
      { id: 0, name: 'APT', decimals: 8, img:null, coinType: '0x1::aptos_coin::AptosCoin' },
      { id: 1,
        name: 'USDC', decimals: 6, img:null,
        coinType: '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832::asset::USDC' },
    ],
    defaultGasUnitPrice: 100,
    maxGasAmount: 200_000,
  },

  devnet: {
    name: 'devnet',
    account: '0x84171af48f266ba207890b75e78b503336c1cef911f693d65eb770da000f971f',
    apiUrl: 'https://sync.aptoosh.com/api/d',
    fileApiUrl: 'https://sync.aptoosh.com/api/cdn',
    cdnBasePath: 'https://aptoosh.b-cdn.net',
    aptos: {
      nodeUrl: 'https://fullnode.devnet.aptoslabs.com/v1',
      indexerGraphqlUrl: 'https://indexer.devnet.aptoslabs.com/v1/graphql',
      faucetUrl: 'https://faucet.devnet.aptoslabs.com',
    },
    explorerBaseUrl: APTOS_EXPLORER_BASE,
    approvedShopWallets: [],
    supportedTokens: [
      { id: 0, name: 'APT', decimals: 8, img:null, coinType: '0x1::aptos_coin::AptosCoin' },
      { id: 1,
        name: 'USDC', decimals: 6, img:null,
        coinType: '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832::asset::USDC' },
    ],
    defaultGasUnitPrice: 100,
    maxGasAmount: 200_000,
  }
};

export const getConfig = (network: NetworkId): NetworkConfig => configs[network];

export const getCurrentConfig = (): NetworkConfig => {
  const raw = (localStorage.getItem(`${APP_KEY_PREFIX}-network`) as NetworkId) || 'testnet';
  const network: NetworkId = ['mainnet', 'testnet', 'devnet'].includes(raw) ? raw : 'testnet';
  return getConfig(network);
};

export const getNetworkIdFromQRCode = (value:string):NetworkId => {
  if(value==="2")return "testnet";
  if(value==="3")return "devnet";
  return "mainnet";
}
export const getNetworkIdForQRCode = (value:NetworkId):NetworkId => {
  if(value==="testnet")return "2";
  if(value==="devnet")return "3";
  return "1";
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

// Lightweight environment helper to detect mobile web

export function isMobileWeb(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const { any } = isMobile(navigator.userAgent || '');
  return any;
}

