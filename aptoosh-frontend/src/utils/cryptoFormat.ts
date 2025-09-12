import {TextCompressor} from "@/lib/textCompressor";

/**
 * Converts a CryptoKey (AES key) to a Base64 string.
 */
export const formatCryptoKeyToBase64 = async (key: CryptoKey): Promise<string> => {
  const exportedKey = await crypto.subtle.exportKey("raw", key);
  const byteArray = new Uint8Array(exportedKey);
  const binary = String.fromCharCode(...byteArray);
  return btoa(binary); // Base64-encoded string
};

/**
 * Truncates a long string to a certain length and adds ellipsis in the middle.
 */
export const truncateString = (
  str: string,
  len = 40,
  position: 'start' | 'middle' | 'end' = 'middle'
): string => {
  if (str.length <= len) return str;
  if (len < 4) return str; // too short to do anything meaningful
  if (position === 'start') {
    return '...' + str.slice(str.length - (len - 3));
  }
  if (position === 'end') {
    return str.slice(0, len - 3) + '...';
  }
  // default to middle
  const half = Math.floor((len - 3) / 2);
  return str.slice(0, half) + '...' + str.slice(str.length - half);
};

export const byteLength = (str: string, compress = false): number => {
  if (compress) {
    return TextCompressor.getCompressedLength(str);
  }
  return new TextEncoder().encode(str).length;
}
