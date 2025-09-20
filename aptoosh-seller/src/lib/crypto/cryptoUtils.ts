import type {InternalAccount} from "@/lib/crypto/types/InternalAccount.ts";
import type {GetStorageResult} from "@/lib/crypto/types/GetStorageResult.ts";
import type {ChainAdapter} from "@/lib/crypto/types/ChainAdapter.ts";
import {aptosAdapter} from "@/lib/crypto/providers/aptosAdapter.ts";
import type {NetworkId} from "@/context/wallet/types.ts";

// Adapter selection (default Aptos). WalletProvider can change it via setChainAdapter.
let adapter: ChainAdapter = aptosAdapter;

export function setChainAdapter(a: ChainAdapter) {
  adapter = a;
}

export function getChainAdapter(): ChainAdapter {
  return adapter;
}

export async function signMessageInternal(internalAccount: InternalAccount, message: string): Promise<Uint8Array> {
  return await adapter.signMessageInternal(internalAccount, message);
}

export async function generateAccount(): Promise<InternalAccount> {
  return await adapter.generateAccount();
}

export async function accountFromMnemonic(mnemonic: string): Promise<InternalAccount> {
  return await adapter.accountFromMnemonic(mnemonic);
}

export function accountToMnemonic(internalAccount: InternalAccount): string {
  const mnemonic = adapter.accountToMnemonic(internalAccount);
  if (!mnemonic) throw new Error("Failed to get mnemonic");
  return mnemonic;
}

export async function getStorageData(storageKey: string): Promise<GetStorageResult> {
  return await adapter.getStorageData(storageKey);
}

export function mapNetworkName(name: string): NetworkId {
  return adapter.mapNetworkName(name);
}

