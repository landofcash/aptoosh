export type ChainId = 'aptos' | string;
export type NetworkId = 'mainnet' | 'testnet' | 'devnet' | 'local' | string;
export type WalletKind = 'external' | 'internal';

// Unique id of external wallet provider (e.g., 'petra', 'walletconnect')
export type WalletProviderId = 'petra' | 'walletconnect' | string;

export interface WalletAdapter {
  readonly chain: ChainId;
  readonly name: string;
  // Unique provider id within a chain
  readonly id: WalletProviderId;

  // Optional: detect if the adapter can be used on this device/session (e.g., window provider installed)
  isInstalled?(): boolean;

  getAddress(): Promise<string | null>;
  getNetwork?(): Promise<NetworkId | null>;

  connect(opts?: { silent?: boolean }): Promise<string | null>;
  disconnect(): Promise<void>;

  onAccountChange?(cb: (address: string | null) => void): () => void;
  onNetworkChange?(cb: (network: NetworkId | null) => void): () => void;
}
