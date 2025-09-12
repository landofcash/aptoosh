import type {ChainAdapter} from "@/lib/crypto/types/ChainAdapter";
import type {InternalAccount} from "@/lib/crypto/types/InternalAccount";
import type {GetStorageResult} from "@/lib/crypto/types/GetStorageResult";
import * as aptosUtils from "@/lib/aptos/aptosUtils.ts";

export const aptosAdapter: ChainAdapter = {
  name: "aptos",

  // Local/custodial basics
  generateAccount: aptosUtils.generateAccountAptos,
  accountFromMnemonic: aptosUtils.accountFromMnemonicAptos,
  accountToMnemonic: aptosUtils.accountToMnemonicAptos,
  signMessage: aptosUtils.signMessageAptos,

  // External wallet
  async signMessageWithWallet(dataToSign: string, humanReadableMessage: string): Promise<Uint8Array> {
    // For now reuse the aptosUtils stub. Later, implement via the wallet standard.
    return aptosUtils.signMessageWithWalletAptos(dataToSign, humanReadableMessage);
  },

  // Payments (placeholder implementation for now)
  async processPaymentInternal(
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
  ): Promise<string> {
    console.log('AptosAdapter.processPaymentInternal called with:', {
      from: internal.addr, tokenTotals, cartItems, seed, publicKey, encryptedSymKeyLocal,
      encryptedSymKeySellerLocal, hashAES, payloadHashLocal, encryptedDeliveryInfoLocal,
    });
    return crypto.randomUUID();
  },

  async processPayment(
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
  ): Promise<string> {
    console.log('AptosAdapter.processPayment called with:', {
      walletAddress, tokenTotals, cartItems, seed, publicKey, encryptedSymKeyLocal,
      encryptedSymKeySellerLocal, hashAES, payloadHashLocal, encryptedDeliveryInfoLocal,
    });
    return crypto.randomUUID();
  },

  // Storage
  async getStorageData(storageKey: string): Promise<GetStorageResult> {
    return aptosUtils.getStorageDataAptos(storageKey);
  },
};
