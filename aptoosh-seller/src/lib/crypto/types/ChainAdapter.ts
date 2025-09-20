import type {InternalAccount} from "@/lib/crypto/types/InternalAccount.ts";
import type {GetStorageResult} from "@/lib/crypto/types/GetStorageResult.ts";

export interface ChainAdapter {
  readonly name: string; // e.g., 'aptos'

  // Wallet-free operations (local/custodial)
  generateAccount(): Promise<InternalAccount>;

  accountFromMnemonic(mnemonic: string): Promise<InternalAccount>;

  accountToMnemonic(internal: InternalAccount): string | undefined;

  signMessageInternal(internal: InternalAccount, message: string): Promise<Uint8Array>;

  // Application-specific hooks (keep parameters generic for swappable chains)
  /**
   * Uploads a product catalogue URL to the blockchain
   * @param catalogueUrl The URL where the product catalogue JSON is hosted
   * @param seed The 22-character base64-encoded UUID seed
   * @param sellerPubKey The seller's public key (base64 encoded)
   * @param senderAddress The sender's chain address
   * @returns The transaction ID
   */
  uploadCatalogueUrlToBlockchain(
    catalogueUrl: string,
    seed: string,
    sellerPubKey: string,
    senderAddress: string
  ): Promise<string>

  /**
   * Deletes a product box from the blockchain using the cleanupProduct method
   * @param seed The 22-character base64-encoded seed
   * @param senderAddress The sender's chain address
   * @returns The transaction ID
   */
  deleteProductBoxOnBlockchain(
    seed: string,
    senderAddress: string
  ): Promise<string>

  /**
   * Refuses an order by calling the smart contract refuseOrder method
   * @param seed The order seed (bytes)
   * @param payloadHashSeller The seller's payload hash (bytes)
   * @param encryptedDeliveryCommentData The encrypted delivery comment data (bytes)
   * @param senderAddress The sender's chain address (seller)
   * @param tokenIds list of tokenIds that are used
   * @param payerAddress where to return funds
   * @returns The transaction ID
   */
  refuseOrderOnBlockchain(
    seed: string,
    payloadHashSeller: string,
    encryptedDeliveryCommentData: string,
    senderAddress: string,
    tokenIds: number[],
    payerAddress: string
  ): Promise<string>

  /**
   * Starts delivering an order by calling the smart contract startDeliveringOrder method
   * @param seed The order seed (bytes)
   * @param payloadHashSeller The seller's payload hash (bytes)
   * @param encryptedDeliveryCommentData The encrypted delivery comment data (bytes)
   * @param senderAddress The sender's chain address (seller)
   * @returns The transaction ID
   */
  startDeliveringOrderOnBlockchain(
    seed: string,
    payloadHashSeller: string,
    encryptedDeliveryCommentData: string,
    senderAddress: string
  ): Promise<string>

  // Encrypted storage access
  getStorageData(storageKey: string): Promise<GetStorageResult>;

  /**
   * Resolves an address to name (Aptos Name Service (ANS), ENS on Ethereum or NFD on Algorand.)
   * @param address The address to resolve
   * @returns The address or null if not found
   */
  resolveAddressToName(address: string): Promise<string | null>
  /**
   * Resolves a name to address (Aptos Name Service (ANS), ENS on Ethereum or NFD on Algorand.)
   * @param name The name to resolve
   * @returns The name or null if not found
   */
  resolveNameToAddress(name: string): Promise<string | null>
}
