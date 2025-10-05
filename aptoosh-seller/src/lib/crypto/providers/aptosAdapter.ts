import type {ChainAdapter} from "@/lib/crypto/types/ChainAdapter.ts";
import * as aptosUtils from "@/lib/aptos/aptosUtils.ts";
import type {EntryFunctionPayload, NetworkId, WalletAdapter} from "@/context/wallet/types.ts";
import {getCurrentConfig} from "@/config";
import type {ProductData} from "@/lib/syncService.ts";
import {getAptosClient} from "@/lib/aptos/aptosClient.ts";
import type {GetStorageResult} from "@/lib/crypto/types/GetStorageResult.ts";
import {hexToBytes} from "@/utils/encoding.ts";
import {getTokenByType} from "@/lib/tokenUtils.ts";

type ProductOnChain = {
  version: string | number;     // often comes back as a string (u64)
  shop: string;                  // address as hex string
  products_url: string;          // Move string
  seller_pubkey: string;         // hex
};

// Helper to unwrap Move `option<T>` shaped as { vec: [] | [T] } or a plain array T[]
function firstFromMoveValue<T>(v: unknown): T | undefined {
  if (Array.isArray(v)) {
    return v[0] as T | undefined;
  }
  const hasVecProperty = (x: unknown): x is { vec: unknown } =>
    typeof x === 'object' && x !== null && 'vec' in (x as Record<string, unknown>);
  if (hasVecProperty(v)) {
    const arr = v.vec;
    if (Array.isArray(arr)) return arr[0] as T | undefined;
  }
  return undefined;
}

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

  // Wallet balances and faucet API used by UI
  async getAccountCoinAmount(address: string, coinType: string): Promise<bigint> {
    const amt = await aptosUtils.getAccountCoinAmount(address, coinType);
    return typeof amt === "bigint" ? amt : BigInt(amt);
  },

  formatCoinAmount(amount: bigint | number, decimals: number, maximumFractionDigits = 4): string {
    return aptosUtils.formatCoinAmount(amount, decimals, maximumFractionDigits);
  },

  async requestDevnetFaucet(accountAddress: string, amountOctas: number): Promise<void> {
    return aptosUtils.requestDevnetFaucet(accountAddress, amountOctas);
  },

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
    walletAdapter: WalletAdapter,
    seed: string,
    payloadHashSeller: string,
    payloadEncrypted: string,
    tokenTypes: string[],
  ): Promise<string> {
    console.log('Refuse order:', walletAdapter.name, seed, payloadHashSeller);
    if (!seed || seed.length !== 22) {
      throw new Error("Seed must be a 22-character string");
    }
    const type_arguments = tokenTypes.map(tokenType => getTokenByType(tokenType).coinType
    );

    const payload: EntryFunctionPayload = {
      function: `${getCurrentConfig().account}::aptoosh::refuse_order`,
      type_arguments,
      arguments: [seed, payloadHashSeller, payloadEncrypted]
    };

    const result = await walletAdapter.signAndSubmit(payload);
    return result.hash;
  },

  async startDeliveringOrderOnBlockchain(
    walletAdapter: WalletAdapter,
    seed: string,
    payloadHashSeller: string,
    payloadEncrypted: string
  ): Promise<string> {
    console.log('Start delivering:', walletAdapter.name, seed, payloadHashSeller);
    if (!seed || seed.length !== 22) {
      throw new Error("Seed must be a 22-character string");
    }
    const payload: EntryFunctionPayload = {
      function: `${getCurrentConfig().account}::aptoosh::start_delivering`,
      type_arguments: [],
      arguments: [seed, payloadHashSeller, payloadEncrypted]
    };
    const result = await walletAdapter.signAndSubmit(payload);
    return result.hash;
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
        sellerPubKey: String.fromCharCode(...hexToBytes(product.seller_pubkey)),
      } as ProductData;
    } catch (error) {
      console.error("Error viewing product:", error);
      throw error;
    }
  },

  async viewBuyerData(seed: string): Promise<GetStorageResult> {
    const client = getAptosClient();
    try {
      const mf: `${string}::${string}::${string}` = `${getCurrentConfig().account}::orders::get_buyer_blob`;
      const payload = {
        function: mf,
        typeArguments: [],
        functionArguments: [seed],
      }
      const response = await client.view({payload})
      if (!response || !response.length || !response[0]) {
        return {data: null, isFound: false}
      }
      if (!Array.isArray(response) || response.length === 0) {
        throw new Error("Unexpected empty response from view call");
      }
      const data = firstFromMoveValue<string>(response[0]);
      if (!data) return {data: null, isFound: false}
      return {data: String.fromCharCode(...hexToBytes(data?.toString())), isFound: true}
    } catch (error) {
      console.error("Error viewSellerData:", error);
      throw error;
    }
  },

  async viewSellerData(seed: string): Promise<GetStorageResult> {
    const client = getAptosClient();
    try {
      const mf: `${string}::${string}::${string}` = `${getCurrentConfig().account}::orders::get_seller_blob`;
      const payload = {
        function: mf,
        typeArguments: [],
        functionArguments: [seed],
      }
      const response = await client.view({payload})
      if (!response || !response.length || !response[0]) {
        return {data: null, isFound: false}
      }
      if (!Array.isArray(response) || response.length === 0) {
        throw new Error("Unexpected empty response from view call");
      }
      const data = firstFromMoveValue<string>(response[0]);
      if (!data) return {data: null, isFound: false}
      return {data: String.fromCharCode(...hexToBytes(data?.toString())), isFound: true}
    } catch (error) {
      console.error("Error viewSellerData:", error);
      throw error;
    }
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
