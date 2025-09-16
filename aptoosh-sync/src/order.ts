/**
 * Order box data structure matching OrderMetadata from smart contract
 */
export interface OrderBoxData {
  version: bigint;
  productSeed: string; // base64 encoded bytes
  status: bigint;
  price: bigint;
  priceToken: bigint;
  seller: string; // Algorand address
  buyer: string; // Algorand address
  payer: string; // Algorand address
  buyerPubKey: string; // base64 encoded bytes
  sellerPubKey: string; // base64 encoded bytes
  encryptedSymKeyBuyer: string; // base64 encoded bytes
  encryptedSymKeySeller: string; // base64 encoded bytes
  symKeyHash: string; // base64 encoded bytes
  payloadHashBuyer: string; // base64 encoded bytes
  payloadHashSeller: string; // base64 encoded bytes
  createdDate: bigint;
  updatedDate: bigint;
  // Derived fields for cache compatibility
  seed: string; // extracted from box name - the order ID
  buyerWallet: string;
  sellerWallet: string;
  amount: bigint;
}
