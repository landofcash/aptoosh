import type {WalletAdapter, NetworkId, EntryFunctionPayload} from "../types";
import {getActiveInternalWallet, createInternalWallet, clearActiveInternalWallet} from "@/lib/crypto/internalWallet";
import {signMessageInternal} from "@/lib/crypto/cryptoUtils";
import {getCurrentConfig} from "@/config";
import {Account, Ed25519PrivateKey} from "@aptos-labs/ts-sdk";
import {getAptosClient} from "@/lib/aptos/aptosClient.ts";


export const internalWalletAdapter: WalletAdapter = {
  chain: 'aptos',
  name: 'Built-in (Internal)',
  id: 'internal',

  isInstalled() {
    return true;
  },

  async getAddress() {
    const acc = await getActiveInternalWallet();
    return acc?.addr ?? null;
  },

  async getNetwork(): Promise<NetworkId | null> {
    return (getCurrentConfig().name as NetworkId) ?? null;
  },

  async connect(opts?: { silent?: boolean }) {
    let acc = await getActiveInternalWallet();
    if (!acc && !opts?.silent) {
      acc = await createInternalWallet();
    }
    return acc?.addr ?? null;
  },

  async disconnect() {
    await clearActiveInternalWallet();
  },

  onAccountChange() {
    return () => {
    };
  },
  onNetworkChange() {
    return () => {
    };
  },

  async signMessage(dataToSign: string /*, message?: string */) {
    const acc = await getActiveInternalWallet();
    if (!acc) throw new Error('No active internal wallet');
    return await signMessageInternal(acc, dataToSign);
  },

  async signAndSubmit(payload: EntryFunctionPayload): Promise<{ hash: string }> {
    const acc = await getActiveInternalWallet();
    if (!acc) throw new Error('No active internal wallet');

    const aptos = getAptosClient();
    const privateKey = new Ed25519PrivateKey(acc.sk);
    const account = Account.fromPrivateKey({privateKey});
    const functionParts = payload.function.split('::')
    const txn = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${functionParts[0]}::${functionParts[1]}::${functionParts[2]}`,
        typeArguments: payload.type_arguments ?? [],
        functionArguments: payload.arguments,
      },
    });
    const committedTxn = await aptos.signAndSubmitTransaction({signer: account, transaction: txn});
    await aptos.waitForTransaction({transactionHash: committedTxn.hash});

    if (!committedTxn?.hash) throw new Error('Internal submit returned no transaction hash');
    return {hash: committedTxn.hash};
  }
};
