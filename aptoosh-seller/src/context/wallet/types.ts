export type ChainId = 'aptos' | string;
export type NetworkId = 'mainnet' | 'testnet' | 'devnet' | 'local' | string;
export type WalletKind = 'external' | 'internal';

export interface WalletAdapter {
  readonly chain: ChainId;
  readonly name: string;

  getAddress(): Promise<string | null>;
  getNetwork?(): Promise<NetworkId | null>;

  connect(opts?: { silent?: boolean }): Promise<string | null>;
  disconnect(): Promise<void>;

  onAccountChange?(cb: (address: string | null) => void): () => void;
  onNetworkChange?(cb: (network: NetworkId | null) => void): () => void;
}
