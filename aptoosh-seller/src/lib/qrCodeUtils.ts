/**
 * Utility functions for QR code generation and UUID handling
 */

export function concatenateIDs(box22charsName: string, uuid2: string): string {
  return box22charsName + uuid2 // todo check length must be 22 chars and must be url encoded
}
