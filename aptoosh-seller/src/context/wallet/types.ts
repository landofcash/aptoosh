export type ChainId = 'aptos' | string;
export type NetworkId = 'mainnet' | 'testnet' | 'devnet' | 'local' | string;
export type WalletKind = 'external' | 'internal';
export type WalletProviderId = 'petra' | 'pontem' | string;

export type EntryFunctionPayload = {
  function: string;
  type_arguments?: string[];
  arguments: (string | number)[];
};

export interface WalletAdapter {
  readonly chain: ChainId;
  readonly name: string;
  readonly id: WalletProviderId;

  // Optional: detect if the adapter can be used on this device/session (e.g., window provider installed)
  isInstalled?(): boolean;

  getAddress(): Promise<string | null>;
  getNetwork?(): Promise<NetworkId | null>;

  connect(opts?: { silent?: boolean }): Promise<string | null>;
  disconnect(): Promise<void>;

  onAccountChange?(cb: (address: string | null) => void): () => void;
  onNetworkChange?(cb: (network: NetworkId | null) => void): () => void;

  signMessage(dataToSign: string, message?: string): Promise<Uint8Array>;
  signAndSubmit(payload: EntryFunctionPayload): Promise<{ hash: string }>;
}
