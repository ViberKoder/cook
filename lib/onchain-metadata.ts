/**
 * Jetton 2.0 On-Chain Metadata Utilities
 * 
 * CRITICAL: Proper TEP-64 on-chain metadata format:
 * - Prefix 0x01 (8 bits) for on-chain data (TEP-64 flag)
 * - Dictionary with keys = sha256(key_name) as Buffer(32)
 * - Values = Cell with string via storeStringTail (snake format for long strings)
 * 
 * Based on TEP-64 standard: https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md
 */

import { beginCell, Cell, Dictionary } from '@ton/core';
import { sha256_sync } from '@ton/crypto';

export interface JettonMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  decimals?: string;
}

/**
 * Build on-chain metadata cell for Jetton 2.0 (TEP-64 format)
 * 
 * @param metadata - Token metadata object
 * @returns Cell with TEP-64 on-chain metadata (prefix 0x00 + dictionary)
 */
export function buildTokenMetadataCell(metadata: JettonMetadata): Cell {
  // Build dictionary: key = sha256(key_name) as Buffer(32), value = Cell with string
  const dict = Dictionary.empty<Buffer, Cell>(
    Dictionary.Keys.Buffer(32),
    Dictionary.Values.Cell()
  );

  // Process all metadata fields (including custom ones)
  Object.entries(metadata).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== null) {
      // Hash the key name - sha256_sync returns Buffer directly
      const keyBuffer = sha256_sync(key);
      
      // Store value as snake-string (storeStringTail handles long strings automatically)
      const valueCell = beginCell()
        .storeStringTail(value)
        .endCell();
      
      dict.set(keyBuffer, valueCell);
      
      console.log(`Added metadata key "${key}":`, {
        keyHash: keyBuffer.toString('hex'),
        valueLength: value.length,
        valuePreview: value.length > 50 ? value.substring(0, 50) + '...' : value,
      });
    }
  });

  // CRITICAL: Use prefix 0x01 for on-chain metadata (TEP-64 flag)
  // This is the correct flag according to TEP-64 standard
  return beginCell()
    .storeUint(1, 8)              // 0x01 — флаг on-chain по TEP-64
    .storeDict(dict)               // Dictionary with metadata
    .endCell();
}

/**
 * Parse on-chain metadata cell back to metadata object
 * 
 * @param cell - Cell with TEP-64 on-chain metadata
 * @returns Parsed metadata object
 */
export function parseTokenMetadataCell(cell: Cell): Partial<JettonMetadata> {
  const slice = cell.beginParse();
  
  // Check prefix
  const prefix = slice.loadUint(8);
  if (prefix !== 1) {
    throw new Error('Not an on-chain metadata cell (missing 0x01 prefix)');
  }
  
  // Load dictionary
  const dict = slice.loadDict(
    Dictionary.Keys.Buffer(32),
    Dictionary.Values.Cell()
  );
  
  const result: Partial<JettonMetadata> = {};
  
  // Standard metadata keys
  const keys: (keyof JettonMetadata)[] = ['name', 'symbol', 'description', 'image', 'decimals'];
  
  for (const key of keys) {
    const keyHash = sha256_sync(key);
    const valueCell = dict.get(keyHash);
    
    if (valueCell) {
      try {
        // Parse string from cell (storeStringTail format)
        const valueSlice = valueCell.beginParse();
        const value = valueSlice.loadStringTail();
        result[key] = value as any;
      } catch (e) {
        console.warn(`Failed to parse metadata key "${key}":`, e);
      }
    }
  }
  
  return result;
}

// Alias for backward compatibility
export const buildOnchainMetadataCell = buildTokenMetadataCell;

// Legacy functions (for off-chain metadata, not used anymore)
export function buildMetadataUri(metadata: JettonMetadata, contractAddress?: string): string {
  // Not used for on-chain metadata
  return '';
}

export function buildOffchainMetadataCell(url: string): Cell {
  // Not used for on-chain metadata
  return beginCell().storeUint(0, 8).endCell();
}
