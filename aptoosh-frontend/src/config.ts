// Aptos-oriented configuration

export type NetworkId = 'mainnet' | 'testnet' | 'devnet' | 'local';

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
  name: NetworkId;
  apiUrl: string;
  aptos: AptosEndpoints;
  explorerBaseUrl: string; // https://explorer.aptoslabs.com
  approvedShopWallets: string[];
  supportedTokens: TokenConfig[];
  defaultGasUnitPrice?: number; // Octas per unit
  maxGasAmount?: number; // in gas units
}

export const APP_VERSION = '0.2.00';
export const signPrefix = 'aptoosh-';

export const APP_NAME = 'Aptoosh';
export const APP_KEY_PREFIX = 'Aptoosh';

// Maximum size for order payload in bytes (2KB)
// while keeping transaction costs reasonable
export const MAX_ORDER_PAYLOAD_BYTES = 2048;

const APTOS_EXPLORER_BASE = 'https://explorer.aptoslabs.com';

const configs: Record<NetworkId, NetworkConfig> = {
  testnet: {
    name: 'testnet',
    apiUrl: 'https://aptoosh-production.up.railway.app/api/t',
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
      { id: 0, name: 'APT', decimals: 8, img: null, coinType: '0x1::aptos_coin::AptosCoin' },
    ],
    defaultGasUnitPrice: 100,
    maxGasAmount: 200_000,
  },
  mainnet: {
    name: 'mainnet',
    apiUrl: 'https://aptoosh-production.up.railway.app/api/m',
    aptos: {
      nodeUrl: 'https://fullnode.mainnet.aptoslabs.com/v1',
      indexerGraphqlUrl: 'https://indexer.mainnet.aptoslabs.com/v1/graphql',
      indexerRestUrl: 'https://indexer-mainnet.staging.gcp.aptosdev.com/v1',
    },
    explorerBaseUrl: APTOS_EXPLORER_BASE,
    approvedShopWallets: [],
    supportedTokens: [
      { id: 0, name: 'APT', decimals: 8, img: null, coinType: '0x1::aptos_coin::AptosCoin' },
    ],
    defaultGasUnitPrice: 100,
    maxGasAmount: 200_000,
  },
  devnet: {
    name: 'devnet',
    apiUrl: 'https://aptoosh-production.up.railway.app/api/d',
    aptos: {
      nodeUrl: 'https://fullnode.devnet.aptoslabs.com/v1',
      indexerGraphqlUrl: 'https://indexer.devnet.aptoslabs.com/v1/graphql',
      faucetUrl: 'https://faucet.devnet.aptoslabs.com',
    },
    explorerBaseUrl: APTOS_EXPLORER_BASE,
    approvedShopWallets: [],
    supportedTokens: [
      { id: 0, name: 'APT', decimals: 8, img: null, coinType: '0x1::aptos_coin::AptosCoin' },
    ],
    defaultGasUnitPrice: 100,
    maxGasAmount: 200_000,
  },
  local: {
    name: 'local',
    apiUrl: 'http://localhost:3000/api',
    aptos: {
      nodeUrl: 'http://localhost:8080/v1',
      indexerGraphqlUrl: 'http://localhost:8090/v1/graphql',
      faucetUrl: 'http://localhost:8081',
    },
    explorerBaseUrl: APTOS_EXPLORER_BASE,
    approvedShopWallets: [],
    supportedTokens: [
      { id: 0, name: 'APT', decimals: 8, img: null, coinType: '0x1::aptos_coin::AptosCoin' },
    ],
    defaultGasUnitPrice: 1,
    maxGasAmount: 500_000,
  },
};

export const getConfig = (network: NetworkId): NetworkConfig => configs[network];

export const getCurrentConfig = (): NetworkConfig => {
  const raw = (localStorage.getItem('network') as NetworkId) || 'testnet';
  const network: NetworkId = ['mainnet', 'testnet', 'devnet', 'local'].includes(raw) ? raw : 'testnet';
  return getConfig(network);
};

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
