import nacl from 'tweetnacl';

// Hex helpers
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error('Invalid hex string');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

// UTF-8 helpers using TextEncoder/Decoder
const enc = new TextEncoder();
const dec = new TextDecoder();

export function utf8ToBytes(s: string): Uint8Array { return enc.encode(s); }
export function bytesToUtf8(b: Uint8Array): string { return dec.decode(b); }

export function base64EncodeUtf8Json(obj: unknown): string {
  const json = JSON.stringify(obj);
  return btoa(json);
}

export function base64DecodeUtf8ToObj<T = any>(b64: string): T {
  const binary = atob(b64);
  return JSON.parse(binary) as T;
}

export function randomNonce24(): Uint8Array {
  return nacl.randomBytes(24);
}

export function generateEphemeralBoxKeyPair(): nacl.BoxKeyPair {
  return nacl.box.keyPair();
}

export function deriveSharedSecretAfter(petraPublicKeyHex: string, dappSecretKey: Uint8Array): Uint8Array {
  const petraPub = hexToBytes(petraPublicKeyHex);
  // nacl.box.before expects recipient public key and own secret key
  return nacl.box.before(petraPub, dappSecretKey);
}

export function encryptAfter(plainBytes: Uint8Array, nonce: Uint8Array, sharedSecret: Uint8Array): Uint8Array {
  return nacl.box.after(plainBytes, nonce, sharedSecret);
}

export function decryptAfter(cipherBytes: Uint8Array, nonce: Uint8Array, sharedSecret: Uint8Array): Uint8Array | null {
  return nacl.box.open.after(cipherBytes, nonce, sharedSecret);
}
