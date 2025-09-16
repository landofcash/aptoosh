/**
 * Type for API response
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}


/**
 * Interface for cached product data that includes box information
 */
export interface ProductCacheEntry {
  seed: string;
  version: number;
  shopWallet: string;
  productsUrl?: string;
  priceToken?: bigint;
  price?: bigint;
  description?: string;
}

/**
 * Interface for cached order data that includes box information
 */
export interface OrderCacheEntry {
  version: bigint;
  seed: string; // renamed from orderId - 22 bytes base64 encoded UUID
  buyerWallet: string;
  sellerWallet: string;
  amount: bigint;
  status: bigint;
  productSeed: string;
  price: bigint;
  priceToken: bigint;
  seller: string;
  buyer: string;
  payer: string;
  buyerPubKey: string;
  sellerPubKey: string;
  encryptedSymKeyBuyer: string;
  encryptedSymKeySeller: string;
  symKeyHash: string;
  payloadHashBuyer: string;
  payloadHashSeller: string;
  createdDate: bigint;
  updatedDate: bigint;
}

/**
 * Interface for product store data
 */
export interface ProductStore {
  id: string;
  shopWallet: string;
  products: ProductCacheEntry[];
  networkName: string;
}

/**
 * Interface for the order store data
 */
export interface OrderStore {
  id: string;
  buyerWallet: string;
  orders: OrderCacheEntry[];
  networkName: string;
}

/**
 * Interface for network sync state
 */
export interface NetworkSyncState {
  networkName: string;
  lastProcessedRound: number;
}
