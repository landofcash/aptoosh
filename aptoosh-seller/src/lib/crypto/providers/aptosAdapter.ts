import type {ChainAdapter} from "@/lib/crypto/types/ChainAdapter";
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

  async uploadCatalogueUrlToBlockchain(
    catalogueUrl: string,
    seed: string,
    sellerPubKey: string,
    senderAddress: string
  ): Promise<string> {
    console.log('Upload catalogue:', {catalogueUrl, seed, sellerPubKey, senderAddress});
    return "TEST_TX_ID_UPLOAD_CATALOGUE";
  },

  async deleteProductBoxOnBlockchain(
    seed: string,
    senderAddress: string
  ): Promise<string> {
    console.log('Delete product:', {seed, senderAddress});
    return "TEST_TX_ID_DELETE_PRODUCT";
  },

  async refuseOrderOnBlockchain(
    seed: string,
    payloadHashSeller: string,
    encryptedDeliveryCommentData: string,
    senderAddress: string,
    tokenIds: number[],
    payerAddress: string
  ): Promise<string> {
    console.log('Refuse order:', {
      seed,
      payloadHashSeller,
      encryptedDeliveryCommentData,
      senderAddress,
      tokenIds,
      payerAddress
    });
    return "TEST_TX_ID_REFUSE_ORDER";
  },

  async startDeliveringOrderOnBlockchain(
    seed: string,
    payloadHashSeller: string,
    encryptedDeliveryCommentData: string,
    senderAddress: string
  ): Promise<string> {
    console.log('Start delivering:', {seed, payloadHashSeller, encryptedDeliveryCommentData, senderAddress});
    return "TEST_TX_ID_START_DELIVERING";
  },


  // Storage
  async getStorageData(storageKey: string): Promise<GetStorageResult> {
    return aptosUtils.getStorageDataAptos(storageKey);
  },
};
