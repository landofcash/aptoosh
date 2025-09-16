export interface Product {
  version: number;
  shopWallet: string;
  sellerPubKey: string;
  productsUrl: string;
  seed: string; // extracted from box name
}
