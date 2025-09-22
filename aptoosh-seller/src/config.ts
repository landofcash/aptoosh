import type {NetworkId} from "@/context/wallet/types.ts";

export const APP_VERSION = '0.2.2'
export const APP_NAME='Aptoosh'
export const BASE_URL='https://aptoosh.com'

// Sign prefix for encryption seed generation
export const signPrefix = "aptoosh-";
export const APP_KEY_PREFIX = 'Aptoosh';
const APTOS_EXPLORER_BASE = 'https://explorer.aptoslabs.com';
const WALLETCONNECT_PROJECT_ID = '9cec891357250a5edfd42c4723e635be';

// Keep TokenConfig backward-compatible (numeric id) for current UI/helpers
export interface TokenConfig {
  id: number; // synthetic numeric id for UI (0 reserved for APT)
  name: string;
  decimals: number;
  img: string | null;
  // Optional Aptos coin type string for future use
  coinType?: string;
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
  walletConnectProjectId?: string | null;
  approvedShopWallets: string[];
  supportedTokens: TokenConfig[];
  defaultGasUnitPrice?: number; // Octas per unit
  maxGasAmount?: number; // in gas units
}

const configs: Record<NetworkId, NetworkConfig> = {
  mainnet: {
    name: 'mainnet',
    account: '0x21ea52c02b58b1792175feac62eb407c7a0503e72e33ba0e0832793cb744149e',
    apiUrl: 'https://sync.aptoosh.com/api/m',
    fileApiUrl: 'https://sync.aptoosh.com/api/cdn',
    cdnBasePath: 'https://aptoosh.b-cdn.net',
    aptos: {
      nodeUrl: 'https://fullnode.mainnet.aptoslabs.com/v1',
      indexerGraphqlUrl: 'https://indexer.mainnet.aptoslabs.com/v1/graphql',
      indexerRestUrl: 'https://indexer-mainnet.staging.gcp.aptosdev.com/v1',
    },
    explorerBaseUrl: APTOS_EXPLORER_BASE,
    walletConnectProjectId: WALLETCONNECT_PROJECT_ID,
    approvedShopWallets: [],
    supportedTokens: [
      { id: 0, name: 'APT', decimals: 8, img: null, coinType: '0x1::aptos_coin::AptosCoin' },
    ],
    defaultGasUnitPrice: 100,
    maxGasAmount: 200_000,
  },

  testnet: {
    name: 'testnet',
    account: '0x21ea52c02b58b1792175feac62eb407c7a0503e72e33ba0e0832793cb744149e',
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
    walletConnectProjectId: WALLETCONNECT_PROJECT_ID,
    approvedShopWallets: [
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    ],
    supportedTokens: [
      { id: 0, name: 'APT', decimals: 8, img: null, coinType: '0x1::aptos_coin::AptosCoin' },
    ],
    defaultGasUnitPrice: 100,
    maxGasAmount: 200_000,
  },

  devnet: {
    name: 'devnet',
    account: '0x21ea52c02b58b1792175feac62eb407c7a0503e72e33ba0e0832793cb744149e',
    apiUrl: 'https://sync.aptoosh.com/api/d',
    fileApiUrl: 'https://sync.aptoosh.com/api/cdn',
    cdnBasePath: 'https://aptoosh.b-cdn.net',
    aptos: {
      nodeUrl: 'https://fullnode.devnet.aptoslabs.com/v1',
      indexerGraphqlUrl: 'https://indexer.devnet.aptoslabs.com/v1/graphql',
      faucetUrl: 'https://faucet.devnet.aptoslabs.com',
    },
    explorerBaseUrl: APTOS_EXPLORER_BASE,
    walletConnectProjectId: WALLETCONNECT_PROJECT_ID,
    approvedShopWallets: [],
    supportedTokens: [
      { id: 0, name: 'APT', decimals: 8, img: null, coinType: '0x1::aptos_coin::AptosCoin' },
    ],
    defaultGasUnitPrice: 100,
    maxGasAmount: 200_000,
  }
};

export const getConfig = (network: NetworkId): NetworkConfig => configs[network];

export const getCurrentConfig = (): NetworkConfig => {
  const raw = (localStorage.getItem('network') as NetworkId) || 'testnet';
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

