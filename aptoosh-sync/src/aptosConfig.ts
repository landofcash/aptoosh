import {config as dotenvConfig} from 'dotenv';
import {Network} from "@aptos-labs/ts-sdk";

dotenvConfig();

//export type AptosNetwork = 'mainnet' | 'testnet' | 'devnet' | 'local';

export interface AptosNetworkConfig {
  network: Network;
  fullnodeUrl: string;
  indexerGraphqlUrl: string;
  indexerApiKey?: string;
  eventStreamUrl?: string;
  moduleAddress: string;
  resourceOwnerAddress: string;
  startVersion: number;
  pollIntervalMs: number;
  pageSize: number;
}

export class AptosConfigManager {
  private configs = new Map<string, AptosNetworkConfig>();

  constructor() {
    this.initializeDefaultConfigs();
  }

  private addConfig(key: string, cfg: AptosNetworkConfig) {
    this.configs.set(key.toLowerCase(), cfg);
  }

  private initializeDefaultConfigs() {
    // Mainnet
    const mainnetConfig: AptosNetworkConfig = {
      network:Network.MAINNET,
      fullnodeUrl: process.env.APTOS_MAINNET_FULLNODE_URL || process.env.APTOS_FULLNODE_URL || 'https://fullnode.mainnet.aptoslabs.com/v1',
      indexerGraphqlUrl: process.env.APTOS_MAINNET_INDEXER_URL || process.env.APTOS_INDEXER_URL || 'https://indexer.mainnet.aptoslabs.com/v1/graphql',
      indexerApiKey: process.env.APTOS_MAINNET_INDEXER_APIKEY || process.env.APTOS_INDEXER_APIKEY || undefined,
      eventStreamUrl: process.env.APTOS_MAINNET_EVENT_STREAM_URL || process.env.APTOS_EVENT_STREAM_URL || undefined,
      moduleAddress: process.env.APTOOSH_MAINNET_MODULE_ADDR || process.env.APTOOSH_MODULE_ADDR || '0x',
      resourceOwnerAddress: process.env.APTOOSH_MAINNET_RESOURCE_OWNER_ADDR || process.env.APTOOSH_RESOURCE_OWNER_ADDR || process.env.APTOOSH_MAINNET_MODULE_ADDR || process.env.APTOOSH_MODULE_ADDR || '0x',
      startVersion: Number(process.env.APTOS_MAINNET_START_VERSION || process.env.APTOS_START_VERSION || 0),
      pollIntervalMs: Number(process.env.APTOS_MAINNET_POLL_INTERVAL_MS || process.env.APTOS_POLL_INTERVAL_MS || 2000),
      pageSize: Number(process.env.APTOS_MAINNET_PAGE_SIZE || process.env.APTOS_PAGE_SIZE || 200),
    }
    const testnetConfig: AptosNetworkConfig = {
      network: Network.TESTNET,
      fullnodeUrl: process.env.APTOS_TESTNET_FULLNODE_URL || process.env.APTOS_FULLNODE_URL || 'https://fullnode.testnet.aptoslabs.com/v1',
      indexerGraphqlUrl: process.env.APTOS_TESTNET_INDEXER_URL || process.env.APTOS_INDEXER_URL || 'https://indexer.testnet.aptoslabs.com/v1/graphql',
      indexerApiKey: process.env.APTOS_TESTNET_INDEXER_APIKEY || process.env.APTOS_INDEXER_APIKEY || undefined,
      eventStreamUrl: process.env.APTOS_TESTNET_EVENT_STREAM_URL || process.env.APTOS_EVENT_STREAM_URL || undefined,
      moduleAddress: process.env.APTOOSH_TESTNET_MODULE_ADDR || process.env.APTOOSH_MODULE_ADDR || '0x',
      resourceOwnerAddress: process.env.APTOOSH_TESTNET_RESOURCE_OWNER_ADDR || process.env.APTOOSH_RESOURCE_OWNER_ADDR || process.env.APTOOSH_TESTNET_MODULE_ADDR || process.env.APTOOSH_MODULE_ADDR || '0x',
      startVersion: Number(process.env.APTOS_TESTNET_START_VERSION || process.env.APTOS_START_VERSION || 0),
      pollIntervalMs: Number(process.env.APTOS_TESTNET_POLL_INTERVAL_MS || process.env.APTOS_POLL_INTERVAL_MS || 2000),
      pageSize: Number(process.env.APTOS_TESTNET_PAGE_SIZE || process.env.APTOS_PAGE_SIZE || 200),
    }
    const devnetConfig: AptosNetworkConfig =  {
      network: Network.DEVNET,
      fullnodeUrl: process.env.APTOS_DEVNET_FULLNODE_URL || process.env.APTOS_FULLNODE_URL || 'https://fullnode.devnet.aptoslabs.com/v1',
      indexerGraphqlUrl: process.env.APTOS_DEVNET_INDEXER_URL || process.env.APTOS_INDEXER_URL || 'https://indexer.devnet.aptoslabs.com/v1/graphql',
      indexerApiKey: process.env.APTOS_DEVNET_INDEXER_APIKEY || process.env.APTOS_INDEXER_APIKEY || undefined,
      eventStreamUrl: process.env.APTOS_DEVNET_EVENT_STREAM_URL || process.env.APTOS_EVENT_STREAM_URL || undefined,
      moduleAddress: process.env.APTOOSH_DEVNET_MODULE_ADDR || process.env.APTOOSH_MODULE_ADDR || '0x',
      resourceOwnerAddress: process.env.APTOOSH_DEVNET_RESOURCE_OWNER_ADDR || process.env.APTOOSH_RESOURCE_OWNER_ADDR || process.env.APTOOSH_DEVNET_MODULE_ADDR || process.env.APTOOSH_MODULE_ADDR || '0x',
      startVersion: Number(process.env.APTOS_DEVNET_START_VERSION || process.env.APTOS_START_VERSION || 0),
      pollIntervalMs: Number(process.env.APTOS_DEVNET_POLL_INTERVAL_MS || process.env.APTOS_POLL_INTERVAL_MS || 2000),
      pageSize: Number(process.env.APTOS_DEVNET_PAGE_SIZE || process.env.APTOS_PAGE_SIZE || 200),
    };


    //this.addConfig('mainnet', mainnetConfig);
    this.addConfig('testnet', testnetConfig);
    this.addConfig('devnet', devnetConfig);
  }

  public getConfig(networkName: string): AptosNetworkConfig | undefined {
    return this.configs.get(networkName.toLowerCase());
  }

  public getAllConfigs(): Map<string, AptosNetworkConfig> {
    return this.configs;
  }
}

export const aptosConfigManager = new AptosConfigManager();
