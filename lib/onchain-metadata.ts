/**
 * Jetton 2.0 On-Chain Metadata Utilities
 * 
 * CRITICAL: Proper TEP-64 on-chain metadata format:
 * - Prefix 0x00 (8 bits) for on-chain data
 * - Dictionary with keys = sha256(key_name) as BigUint(256)
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
  // Build dictionary: key = sha256(key_name) as BigUint(256), value = Cell with string
  const contentDict = Dictionary.empty<bigint, Cell>(
    Dictionary.Keys.BigUint(256),
    Dictionary.Values.Cell()
  );

  // Process all metadata fields
  const metadataObj: Record<string, string> = {
    name: metadata.name,
    symbol: metadata.symbol,
    description: metadata.description || '',
    image: metadata.image || '',
    decimals: metadata.decimals || '9',
  };

  for (const [key, value] of Object.entries(metadataObj)) {
    if (value && value.trim() !== '') {
      // Hash the key name
      const keyBuffer = sha256_sync(key); // Buffer 32 bytes
      const keyBigInt = BigInt('0x' + keyBuffer.toString('hex'));
      
      // Store value as snake-string (storeStringTail handles long strings automatically)
      const valueCell = beginCell()
        .storeStringTail(value)
        .endCell();
      
      contentDict.set(keyBigInt, valueCell);
      
      console.log(`Added metadata key "${key}":`, {
        keyHash: keyBigInt.toString(16),
        valueLength: value.length,
        valuePreview: value.length > 50 ? value.substring(0, 50) + '...' : value,
      });
    }
  }

  // Final content cell: prefix 0x00 + dictionary
  const jettonOnChainContent = beginCell()
    .storeUint(0, 8)              // <--- ОБЯЗАТЕЛЬНЫЙ префикс для on-chain!
    .storeDict(contentDict)
    .endCell();

  console.log('On-chain metadata cell created:', {
    bits: jettonOnChainContent.bits.length,
    refs: jettonOnChainContent.refs.length,
    dictSize: contentDict.size,
    hash: jettonOnChainContent.hash().toString('hex').substring(0, 16) + '...',
  });

  return jettonOnChainContent;
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
  if (prefix !== 0) {
    throw new Error('Not an on-chain metadata cell (missing 0x00 prefix)');
  }
  
  // Load dictionary
  const dict = slice.loadDict(
    Dictionary.Keys.BigUint(256),
    Dictionary.Values.Cell()
  );
  
  const result: Partial<JettonMetadata> = {};
  
  // Standard metadata keys
  const keys: (keyof JettonMetadata)[] = ['name', 'symbol', 'description', 'image', 'decimals'];
  
  for (const key of keys) {
    const keyBuffer = sha256_sync(key);
    const keyBigInt = BigInt('0x' + keyBuffer.toString('hex'));
    const valueCell = dict.get(keyBigInt);
    
    if (valueCell) {
      try {
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
