/**
 * Utility functions for QR code generation and UUID handling
 */

import {bytesToUuid, encodeBase64Uuid} from './uuidUtils'


export function decodeConcatenatedIDs(data: string): [string, string] {
  const catalogueId = data.slice(0, 22)
  const productId = data.slice(22, 44)
  return [catalogueId, productId]
}

/**
 * Decodes a base64 string containing two concatenated UUIDs into their original UUID strings
 * @param base64String The base64 encoded string containing two concatenated UUIDs
 * @returns A tuple containing the two decoded UUID strings
 * @throws Error if the input is invalid or cannot be decoded into two UUIDs
 */
export function decodeConcatenatedUUIDs(base64String: string): [string, string] {
  try {
    // Decode base64 string to binary string
    const binaryString = atob(base64String)

    // Convert binary string to Uint8Array
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Validate length
    if (bytes.length !== 32) {
      throw new Error('Invalid input length. Expected 32 bytes for two UUIDs.')
    }

    // Split into two 16-byte arrays
    const uuid1Bytes = bytes.slice(0, 16)
    const uuid2Bytes = bytes.slice(16)

    // Convert bytes to UUID strings using the shared utility
    return [encodeBase64Uuid(bytesToUuid(uuid1Bytes)), bytesToUuid(uuid2Bytes)]
  } catch (error) {
    throw new Error(`Failed to decode UUIDs: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
