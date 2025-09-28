declare module '@circle-fin/w3s-pw-web-sdk' {
  export interface CircleAuthModule {
    getUserToken?: () => Promise<unknown>;
    logout?: () => Promise<void>;
  }

  export interface CircleWalletsModule {
    listWallets(): Promise<unknown>;
  }

  export interface CircleAddressesModule {
    listAddresses(request: { walletId: string }): Promise<unknown>;
  }

  export interface CircleSignaturesModule {
    createSignature(request: Record<string, unknown>): Promise<unknown>;
  }

  export interface CircleTransactionsModule {
    createTransaction(request: Record<string, unknown>): Promise<unknown>;
  }

  export interface CircleW3sClient {
    auth: CircleAuthModule;
    wallets: CircleWalletsModule;
    addresses: CircleAddressesModule;
    signatures: CircleSignaturesModule;
    transactions: CircleTransactionsModule;
  }

  export function createW3sClient(options?: Record<string, unknown>): CircleW3sClient;
}
