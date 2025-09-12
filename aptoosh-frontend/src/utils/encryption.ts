import * as ecies from "eciesjs";
import {b64ToBytes, b64FromBytes} from "./encoding";

/**
 * Generates a random AES-GCM key (256-bit).
 * @returns {Promise<CryptoKey>} AES CryptoKey
 */
export async function generateAESKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {name: "AES-GCM", length: 256},
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a given text using AES-GCM.
 * @param {CryptoKey} key - AES key
 * @param {string} text - Text to encrypt
 * @returns {Promise<string>} Base64 encoded IV + Ciphertext
 */
export async function encryptAES(key: CryptoKey, text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for AES-GCM

  const encrypted = await crypto.subtle.encrypt(
    {name: "AES-GCM", iv},
    key,
    data
  );

  return (
    btoa(String.fromCharCode(...iv)) +
    ":" +
    btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  );
}

/**
 * Decrypts a base64 encoded AES-GCM encrypted string.
 * @param {CryptoKey} key - AES key
 * @param {string} encrypted - Base64 encoded IV + Ciphertext (format: base64_iv:base64_ciphertext)
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decryptAES(key: CryptoKey, encrypted: string): Promise<string> {
  const [ivB64, ciphertextB64] = encrypted.split(":");
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    {name: "AES-GCM", iv},
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypts an AES key using ECIES with secp256k1.
 * @param {string} publicKeyBase64 - Receiver's public key (Base64)
 * @param {CryptoKey} aesKey - AES key to encrypt
 * @returns {Promise<string>} Encrypted AES key (Base64)
 */
export async function encryptWithECIES(publicKeyBase64: string, aesKey: CryptoKey): Promise<string> {
  // Export the AES key as raw bytes
  const exportedKey = await crypto.subtle.exportKey("raw", aesKey);
  const aesKeyBytes = new Uint8Array(exportedKey);

  // Convert public key base64 to Uint8Array
  const publicKeyBytes = b64ToBytes(publicKeyBase64);

  // Encrypt the AES key with ECIES (secp256k1)
  const encryptedAESKey = ecies.encrypt(publicKeyBytes, aesKeyBytes);

  // Convert the result to Uint8Array if it's a Buffer, then to Base64
  const encryptedBytes = new Uint8Array(encryptedAESKey);
  return b64FromBytes(encryptedBytes);
}

/**
 * Decrypts a Base64-encoded AES key using ECIES with secp256k1.
 * @param {string} privateKeyBase64 - Your private key (Base64)
 * @param {string} encryptedBase64 - Encrypted AES key (Base64)
 * @returns {Promise<CryptoKey>} Decrypted AES CryptoKey
 */
export async function decryptWithECIES(privateKeyBase64: string, encryptedBase64: string): Promise<CryptoKey> {
  const privateKeyBytes = b64ToBytes(privateKeyBase64);
  const encryptedBytes = b64ToBytes(encryptedBase64);

  // Decrypt AES key bytes using ECIES
  const decryptedAESBytes = ecies.decrypt(privateKeyBytes, encryptedBytes);

  // Convert the result to Uint8Array if it's a Buffer
  const decryptedBytes = new Uint8Array(decryptedAESBytes);

  // Import as AES-GCM CryptoKey
  return await crypto.subtle.importKey(
    "raw",
    decryptedBytes,
    {name: "AES-GCM"},
    true,
    ["encrypt", "decrypt"]
  );
}
