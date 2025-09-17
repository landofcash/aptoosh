import type {InternalAccount} from "@/lib/crypto/types/InternalAccount.ts";
import type {GetStorageResult} from "@/lib/crypto/types/GetStorageResult.ts";

export interface ChainAdapter {
  readonly name: string; // e.g., 'aptos'

  // Wallet-free operations (local/custodial)
  generateAccount(): Promise<InternalAccount>;

  accountFromMnemonic(mnemonic: string): Promise<InternalAccount>;

  accountToMnemonic(internal: InternalAccount): string | undefined;

  signMessage(internal: InternalAccount, message: string): Promise<Uint8Array>;

  // Wallet-based (external wallet, e.g., Petra on Aptos)
  signMessageWithWallet(dataToSign: string, humanReadableMessage: string): Promise<Uint8Array>;

  // Application-specific hooks (keep parameters generic for swappable chains)
  processPaymentInternal(
    internal: InternalAccount,
    tokenTotals: Record<number, bigint>,
    cartItems: any[],
    seed: string,
    publicKey: string,
    encryptedSymKeyLocal: string,
    encryptedSymKeySellerLocal: string,
    hashAES: string,
    payloadHashLocal: string,
    encryptedDeliveryInfoLocal: string,
  ): Promise<string>; // returns tx hash/id

  processPayment(
    walletAddress: string,
    tokenTotals: Record<number, bigint>,
    cartItems: any[],
    seed: string,
    publicKey: string,
    encryptedSymKeyLocal: string,
    encryptedSymKeySellerLocal: string,
    hashAES: string,
    payloadHashLocal: string,
    encryptedDeliveryInfoLocal: string,
  ): Promise<string>;

  // Encrypted storage access
  getStorageData(storageKey: string): Promise<GetStorageResult>;
}
