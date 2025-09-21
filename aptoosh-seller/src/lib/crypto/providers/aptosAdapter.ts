import type {ChainAdapter} from "@/lib/crypto/types/ChainAdapter";
import type {GetStorageResult} from "@/lib/crypto/types/GetStorageResult";
import * as aptosUtils from "@/lib/aptos/aptosUtils.ts";
import type {EntryFunctionPayload, NetworkId, WalletAdapter} from "@/context/wallet/types.ts";
import {getCurrentConfig} from "@/config";

export const aptosAdapter: ChainAdapter = {
  name: "aptos",
  generateAccount: aptosUtils.generateAccountAptos,
  accountFromMnemonic: aptosUtils.accountFromMnemonicAptos,
  accountToMnemonic: aptosUtils.accountToMnemonicAptos,
  signMessageInternal: aptosUtils.signMessageAptos,

  async uploadCatalogueUrlToBlockchain(
    walletAdapter: WalletAdapter,
    seed: string,
    sellerPubKey: string,
    catalogueUrl: string
  ): Promise<string> {
    console.log(`Create product: ${seed} wallet ${walletAdapter.name} sellerPubKey:${sellerPubKey} url:${catalogueUrl}`);
    if (!seed || seed.length !== 22) {
      throw new Error("Seed must be a 22-character string");
    }
    const payload: EntryFunctionPayload = {
      function: `${getCurrentConfig().account}::aptoosh::create_product`,
      type_arguments: [],
      arguments: [seed, sellerPubKey, catalogueUrl]
    };
    const result = await walletAdapter.signAndSubmit(payload);
    return result.hash;
  },

  async deleteProductBoxOnBlockchain(
    walletAdapter: WalletAdapter,
    seed: string
  ): Promise<string> {
    console.log(`Delete product: ${seed} wallet ${walletAdapter.name}`);
    if (!seed || seed.length !== 22) {
      throw new Error("Seed must be a 22-character string");
    }
    const payload: EntryFunctionPayload = {
      function: `${getCurrentConfig().account}::aptoosh::delete_product`,
      type_arguments: [],
      arguments: [seed]
    };
    const result = await walletAdapter.signAndSubmit(payload);
    return result.hash;
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

  async resolveAddressToName(address: string): Promise<string | null> {
    return address;
  },

  async resolveNameToAddress(name: string): Promise<string | null> {
    return name;
  },

  mapNetworkName(name?: string): NetworkId {
    if (!name) throw new Error('Network name is required');
    const n = name.toLowerCase();
    if (n.includes('main')) return 'mainnet';
    if (n.includes('test')) return 'testnet';
    if (n.includes('dev')) return 'devnet';
    if (n.includes('local')) return 'localnet';
    return name as NetworkId;
  }
};
