import {Account, type Ed25519Account, Ed25519PrivateKey, Aptos, AptosConfig, Network} from "@aptos-labs/ts-sdk";
import * as bip39 from '@scure/bip39';
import {wordlist} from '@scure/bip39/wordlists/english.js';

import type {InternalAccount} from "@/lib/crypto/types/InternalAccount.ts";
import {getAptosClient} from "@/lib/aptos/aptosClient";

const APTOS_PATH = "m/44'/637'/0'/0'/0'";

export async function signMessageAptos(internalAccount: InternalAccount, message: string): Promise<Uint8Array> {
  const messageBytes = new TextEncoder().encode(message);
  const aptosAccount: Account = toAccountAptos(internalAccount);
  const sig = aptosAccount.sign(messageBytes);
  return sig.toUint8Array();
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
  const mnemonic = bip39.generateMnemonic(wordlist);
  const account = Account.fromDerivationPath({mnemonic, path: APTOS_PATH});
  return {
    addr: account.accountAddress.toString(),
    sk: account.privateKey.toUint8Array(),
    mnemonic: mnemonic
  };
}

// --- Aptos SDK helpers for on-chain queries and devnet faucet ---
export async function getAccountCoinAmount(address: string, coinType: string): Promise<number | bigint> {
  const client = getAptosClient();
  return await client.getAccountCoinAmount({
    accountAddress: address,
    coinType: coinType as `${string}::${string}::${string}`,
  });
}

export function formatCoinAmount(amount: bigint | number, decimals: number, maximumFractionDigits = 4): string {
  const num = typeof amount === 'bigint' ? Number(amount) : Number(amount);
  return (num / Math.pow(10, decimals)).toLocaleString(undefined, {maximumFractionDigits});
}

export async function getFormattedBalance(address: string, coinType: string, decimals: number): Promise<string> {
  const amount = await getAccountCoinAmount(address, coinType);
  return formatCoinAmount(amount, decimals);
}

// Devnet faucet via SDK using a dedicated Devnet-configured client
export async function requestDevnetFaucet(accountAddress: string, amountOctas: number): Promise<void> {
  const aptos = new Aptos(new AptosConfig({network: Network.DEVNET}));
  await aptos.fundAccount({
    accountAddress, amount:
    amountOctas,
    options: {
      timeoutSecs: 3,
      checkSuccess: true,
      waitForIndexer: false,
    }
  });
}
