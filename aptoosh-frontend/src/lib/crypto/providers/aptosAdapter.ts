import type {ChainAdapter} from "@/lib/crypto/types/ChainAdapter";
import * as aptosUtils from "@/lib/aptos/aptosUtils.ts";
import type {EntryFunctionPayload, NetworkId, WalletAdapter} from "@/context/wallet/types.ts";
import {getCurrentConfig} from "@/config";
import type {ProductData} from "@/lib/syncService.ts";
import {getAptosClient} from "@/lib/aptos/aptosClient.ts";
import type {GetStorageResult} from "@/lib/crypto/types/GetStorageResult.ts";
import type {CartItem} from "@/lib/cartStorage.ts";
import {getTokenById} from "@/lib/tokenUtils.ts";

type ProductOnChain = {
  version: string | number;     // often comes back as a string (u64)
  shop: string;                  // address as hex string
  products_url: string;          // Move string
  seller_pubkey: string;         // hex or base64, depending on how you stored it
};

const unwrapOptionVec = <T>(value: unknown): T | null => {
  if (value == null) return null;

  // vectors as plain arrays
  if (Array.isArray(value)) {
    return value.length > 0 ? (value[0] as T) : null;
  }

  // vectors as { vec: [...] }
  const obj = value as { vec?: unknown };
  if (Array.isArray(obj?.vec)) {
    return obj.vec.length > 0 ? (obj.vec[0] as T) : null;
  }

  return null; // unknown shape
};

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

  async createOrderInitialOnBlockchain(
    walletAdapter: WalletAdapter,
    tokenTotals: Record<number, bigint>,
    cartItems: CartItem[],
    orderSeed: string,
    buyerPubKey: string,
    encryptedSymKeyBuyer: string,
    encryptedSymKeySeller: string,
    symKeyHash: string,
    payloadHash: string,
    encryptedData: string
  ): Promise<string> {
    if (!cartItems?.length) throw new Error("Cart is empty");
    if (!orderSeed || orderSeed.length !== 22) throw new Error("Order seed must be a 22-character string");
    const first = cartItems[0];
    if (!first.seed || first.seed.length !== 22) throw new Error("Product seed must be a 22-character string");
    if (!first.shopWallet) throw new Error("Missing seller address (shopWallet)");
    if (!first.sellerPubKey) throw new Error("Missing seller public key");

    const tokenIds = Object.keys(tokenTotals || {});
    if (tokenIds.length === 0) throw new Error("tokenTotals is empty");
    if (tokenIds.length > 1) console.warn("Multiple token totals provided; using the first one only");

    const tokenId = Number(tokenIds[0]);
    const total = tokenTotals[tokenId] ?? 0n;
    const amountStr = total.toString();

    const coinType = getTokenById(tokenId).coinType || '0x1::aptos_coin::AptosCoin';

    const payload: EntryFunctionPayload = {
      function: `${getCurrentConfig().account}::aptoosh::create_order_initial`,
      type_arguments: [coinType],
      arguments: [
        orderSeed,
        first.seed,
        first.shopWallet,
        amountStr,
        buyerPubKey,
        first.sellerPubKey,
        encryptedSymKeyBuyer,
        encryptedSymKeySeller,
        symKeyHash,
        payloadHash,
        encryptedData,
      ],
    };

    const result = await walletAdapter.signAndSubmit(payload);
    return result.hash;
  },

  async createOrderPaidOnBlockchain(
    walletAdapter: WalletAdapter,
    tokenTotals: Record<number, bigint>,
    cartItems: CartItem[],
    orderSeed: string,
    buyerPubKey: string,
    encryptedSymKeyBuyer: string,
    encryptedSymKeySeller: string,
    symKeyHash: string,
    payloadHash: string,
    encryptedData: string
  ): Promise<string> {
    if (!cartItems?.length) throw new Error("Cart is empty");
    if (!orderSeed || orderSeed.length !== 22) throw new Error("Order seed must be a 22-character string");
    const first = cartItems[0];
    if (!first.seed || first.seed.length !== 22) throw new Error("Product seed must be a 22-character string");
    if (!first.shopWallet) throw new Error("Missing seller address (shopWallet)");
    if (!first.sellerPubKey) throw new Error("Missing seller public key");

    const tokenIds = Object.keys(tokenTotals || {});
    if (tokenIds.length === 0) throw new Error("tokenTotals is empty");
    if (tokenIds.length > 1) console.warn("Multiple token totals provided; using the first one only");

    const tokenId = Number(tokenIds[0]);
    const total = tokenTotals[tokenId] ?? 0n;
    const amountStr = total.toString();

    const coinType = getTokenById(tokenId).coinType || '0x1::aptos_coin::AptosCoin';

    const payload: EntryFunctionPayload = {
      function: `${getCurrentConfig().account}::aptoosh::create_order_paid`,
      type_arguments: [coinType],
      arguments: [
        orderSeed,
        first.seed,
        first.shopWallet,
        buyerPubKey,
        first.sellerPubKey,
        encryptedSymKeyBuyer,
        encryptedSymKeySeller,
        symKeyHash,
        payloadHash,
        encryptedData,
        amountStr,
      ],
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

  async viewProductOnBlockchain(seed: string): Promise<ProductData> {
    const client = getAptosClient();
    try {
      const mf: `${string}::${string}::${string}` = `${getCurrentConfig().account}::products::get_product`;
      const payload = {
        function: mf,
        typeArguments: [],
        functionArguments: [seed],
      }
      const response = await client.view({payload})
      if (!response || !response.length || !response[0]) {
        throw new Error("Product not found");
      }
      if (!Array.isArray(response) || response.length === 0) {
        throw new Error("Unexpected empty response from view call");
      }

      const product = unwrapOptionVec<ProductOnChain>(response[0]);
      if (!product) {
        throw new Error("Product not found");
      }

      const versionNum = typeof product.version === 'string' ? Number(product.version) : product.version;

      return {
        version: versionNum,
        seed,
        shopWallet: product.shop,
        productsUrl: product.products_url,
        sellerPubKey: product.seller_pubkey,
      } as ProductData;
    } catch (error) {
      console.error("Error viewing product:", error);
      throw error;
    }
  },

  async getStorageData(key: string): Promise<GetStorageResult> {
    const client = getAptosClient();

    try {
      const response = await client.view(
        {
          payload: {
            function: `${getCurrentConfig().account}::aptoosh::get_storage_data`,
            typeArguments: [],
            functionArguments: [key],
          }
        }
      )
      if (!response || !response.length || !response[0]) {

      }
    } catch (error) {
      console.error("Error getStorageData:", error);
      throw error;
    }
    return {data: null, isFound: false}
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
  },

};
