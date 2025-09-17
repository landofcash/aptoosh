import {Account, type Ed25519Account, Ed25519PrivateKey} from "@aptos-labs/ts-sdk";
import {derivePath} from "ed25519-hd-key";
import * as bip39 from "bip39";

import type {InternalAccount} from "@/lib/crypto/types/InternalAccount.ts";
import type {GetStorageResult} from "@/lib/crypto/types/GetStorageResult.ts";

const APTOS_PATH = "m/44'/637'/0'/0'/0'";

export async function signMessageAptos(internalAccount: InternalAccount, message: string): Promise<Uint8Array> {
  const messageBytes = new TextEncoder().encode(message);
  const aptosAccount: Account = toAccountAptos(internalAccount);
  const sig = aptosAccount.sign(messageBytes);
  return sig.toUint8Array();
}

export async function signMessageWithWalletAptos(data: string, message: string): Promise<Uint8Array> {
  const messageBytes = new TextEncoder().encode(data);
  console.log("signMessageWithWalletAptos", data, message);
  //TODO: Implement this
  return messageBytes;
}

export function toAccountAptos(internal: InternalAccount): Account {
  const sk = new Ed25519PrivateKey(internal.sk);
  return Account.fromPrivateKey({privateKey: sk});
}

export function fromAccountAptos(account: Ed25519Account, mnemonic: string): InternalAccount {
  return {
    addr: account.accountAddress.toString(),         // "0x..."
    sk: account.privateKey.toUint8Array(),           // 32-byte Ed25519 private key
    mnemonic: mnemonic,
  };
}

export async function generateAccountAptos(): Promise<InternalAccount> {
  return generateAccountWithMnemonic();
}

export async function accountFromMnemonicAptos(mnemonic: string): Promise<InternalAccount> {
  const account = Account.fromDerivationPath({mnemonic, path: APTOS_PATH});
  return fromAccountAptos(account, mnemonic);
}

export function accountToMnemonicAptos(internalAccount: InternalAccount): string | undefined {
  return internalAccount.mnemonic;
}

async function generateAccountWithMnemonic(): Promise<InternalAccount> {
  const mnemonic = bip39.generateMnemonic();
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const {key} = derivePath(APTOS_PATH, seed.toString("hex"));
  const privateKey = new Ed25519PrivateKey(key);
  const account = Account.fromPrivateKey({privateKey});
  return {
    addr: account.accountAddress.toString(),
    sk: privateKey.toUint8Array(),
    mnemonic: mnemonic
  };
}

export async function getStorageDataAptos(storageKey: string): Promise<GetStorageResult> {
  console.log("getStorageData storageKey:", storageKey);
  return {data: null, isFound: false};
}
