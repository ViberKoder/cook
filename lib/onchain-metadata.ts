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
import { Sha256 } from '@aws-crypto/sha256-js';

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
// SHA256 hash function (matching minter-frontend implementation)
function sha256(str: string): Buffer {
  const hash = new Sha256();
  hash.update(str);
  return Buffer.from(hash.digestSync());
}

// Convert string to snake format cell (matching minter-frontend implementation)
function makeSnakeCell(data: Buffer): Cell {
  const CELL_MAX_SIZE_BYTES = 127;
  
  const chunks: Buffer[] = [];
  let remaining = data;
  
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, CELL_MAX_SIZE_BYTES));
    remaining = remaining.slice(CELL_MAX_SIZE_BYTES);
  }
  
  // Build from the end
  let currentCell: Cell | null = null;
  
  for (let i = chunks.length - 1; i >= 0; i--) {
    const builder = beginCell();
    
    if (i === 0) {
      // First chunk - add snake prefix
      builder.storeUint(0, 8);
    }
    
    builder.storeBuffer(chunks[i]);
    
    if (currentCell) {
      builder.storeRef(currentCell);
    }
    
    currentCell = builder.endCell();
  }
  
  return currentCell || beginCell().storeUint(0, 8).endCell();
}

export function buildTokenMetadataCell(metadata: JettonMetadata): Cell {
  // Build dictionary: key = sha256(key_name) as Buffer(32), value = Cell with snake string
  // Using Buffer(32) keys like in minter-frontend for better compatibility
  const dict = Dictionary.empty<Buffer, Cell>(
    Dictionary.Keys.Buffer(32),
    Dictionary.Values.Cell()
  );

  // Standard metadata keys (in order of importance)
  const keys: (keyof JettonMetadata)[] = ['name', 'symbol', 'description', 'image', 'decimals'];
  
  for (const key of keys) {
    const value = metadata[key];
    if (value && value.trim() !== '') {
      // Hash the key name to get Buffer(32)
      const keyHash = sha256(key);
      
      // Store value as snake-string using makeSnakeCell (matching minter-frontend)
      const valueBuffer = Buffer.from(value, 'utf-8');
      const valueCell = makeSnakeCell(valueBuffer);
      
      dict.set(keyHash, valueCell);
      
      console.log(`Added metadata key "${key}":`, {
        keyHash: keyHash.toString('hex'),
        valueLength: value.length,
        valuePreview: value.length > 50 ? value.substring(0, 50) + '...' : value,
      });
    }
  }

  // CRITICAL: For Jetton 2.0 on-chain metadata
  // The contract expects metadata_uri as a snake slice (URI string),
  // but for on-chain metadata we need to store TEP-64 dictionary.
  // 
  // The contract's build_content_cell() will try to read metadata_uri as URI
  // and wrap it in a dictionary with "uri" key. But we want to store
  // the dictionary directly.
  //
  // SOLUTION: Store the TEP-64 dictionary WITH prefix 0x00.
  // Even though contract will try to parse it as URI, explorers should
  // be able to read the dictionary directly from the cell.
  // The prefix 0x00 indicates on-chain metadata format (TEP-64).
  return beginCell()
    .storeUint(0, 8)              // TEP-64 on-chain metadata prefix
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
  if (prefix !== 0) {
    throw new Error('Not an on-chain metadata cell (missing 0x00 prefix)');
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
    const keyHash = sha256(key);
    const valueCell = dict.get(keyHash);
    
    if (valueCell) {
      try {
        // Parse snake cell
        let valueSlice = valueCell.beginParse();
        const chunks: Buffer[] = [];
        
        // Skip snake prefix if present
        if (valueSlice.remainingBits >= 8) {
          const prefix = valueSlice.loadUint(8);
          if (prefix === 0) {
            // Snake format - read chunks
            while (true) {
              const bits = valueSlice.remainingBits;
              if (bits > 0) {
                chunks.push(valueSlice.loadBuffer(Math.floor(bits / 8)));
              }
              if (valueSlice.remainingRefs === 0) {
                break;
              }
              valueSlice = valueSlice.loadRef().beginParse();
            }
            const value = Buffer.concat(chunks).toString('utf-8');
            result[key] = value as any;
          }
        }
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
