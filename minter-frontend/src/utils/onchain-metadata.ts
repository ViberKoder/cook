/**
 * On-chain metadata builder for Jetton 2.0
 * Based on https://github.com/ton-blockchain/minter-contract/blob/main/build/jetton-minter.deploy.ts
 * 
 * Uses TEP-64 standard:
 * - Prefix 0x00 for on-chain data
 * - SHA-256 hashed keys
 * - Snake format for values (chain of refs for long data)
 */

import { beginCell, Cell, Dictionary, Slice } from '@ton/core';
import { Sha256 } from '@aws-crypto/sha256-js';

const ONCHAIN_CONTENT_PREFIX = 0x00;
const SNAKE_PREFIX = 0x00;

// Standard Jetton metadata keys
export type JettonMetadataKeys = 'name' | 'description' | 'image' | 'symbol' | 'decimals';

// SHA256 hash function
function sha256(str: string): Buffer {
  const hash = new Sha256();
  hash.update(str);
  return Buffer.from(hash.digestSync());
}

// Convert string to snake format cell
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
      builder.storeUint(SNAKE_PREFIX, 8);
    }
    
    builder.storeBuffer(chunks[i]);
    
    if (currentCell) {
      builder.storeRef(currentCell);
    }
    
    currentCell = builder.endCell();
  }
  
  return currentCell || beginCell().storeUint(SNAKE_PREFIX, 8).endCell();
}

// Parse snake cell back to buffer
function parseSnakeCell(cell: Cell): Buffer {
  let slice = cell.beginParse();
  
  // Skip snake prefix if present
  if (slice.remainingBits >= 8) {
    const prefix = slice.loadUint(8);
    if (prefix !== SNAKE_PREFIX) {
      throw new Error('Invalid snake cell prefix');
    }
  }
  
  const chunks: Buffer[] = [];
  
  while (true) {
    const bits = slice.remainingBits;
    if (bits > 0) {
      chunks.push(slice.loadBuffer(bits / 8));
    }
    
    if (slice.remainingRefs === 0) {
      break;
    }
    
    slice = slice.loadRef().beginParse();
  }
  
  return Buffer.concat(chunks);
}

export interface JettonMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  decimals?: string;
}

/**
 * Build on-chain metadata cell for Jetton 2.0
 * 
 * @param metadata - Token metadata object
 * @returns Cell with TEP-64 on-chain metadata
 */
export function buildTokenMetadataCell(metadata: JettonMetadata): Cell {
  const dict = Dictionary.empty(
    Dictionary.Keys.Buffer(32),
    Dictionary.Values.Cell()
  );
  
  // Standard keys mapping
  const entries: [JettonMetadataKeys, string | undefined][] = [
    ['name', metadata.name],
    ['symbol', metadata.symbol],
    ['description', metadata.description],
    ['image', metadata.image],
    ['decimals', metadata.decimals || '9'],
  ];
  
  for (const [key, value] of entries) {
    if (value === undefined || value === '') continue;
    
    const keyHash = sha256(key);
    const valueBuffer = Buffer.from(value, 'utf-8');
    const valueCell = makeSnakeCell(valueBuffer);
    
    dict.set(keyHash, valueCell);
  }
  
  return beginCell()
    .storeUint(ONCHAIN_CONTENT_PREFIX, 8)
    .storeDict(dict)
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
  
  const prefix = slice.loadUint(8);
  if (prefix !== ONCHAIN_CONTENT_PREFIX) {
    throw new Error('Not an on-chain metadata cell');
  }
  
  const dict = slice.loadDict(
    Dictionary.Keys.Buffer(32),
    Dictionary.Values.Cell()
  );
  
  const result: Partial<JettonMetadata> = {};
  
  const keys: JettonMetadataKeys[] = ['name', 'symbol', 'description', 'image', 'decimals'];
  
  for (const key of keys) {
    const keyHash = sha256(key);
    const valueCell = dict.get(keyHash);
    
    if (valueCell) {
      try {
        const valueBuffer = parseSnakeCell(valueCell);
        result[key] = valueBuffer.toString('utf-8');
      } catch (e) {
        // Skip invalid values
      }
    }
  }
  
  return result;
}

// Alias for backward compatibility
export const buildOnchainMetadataCell = buildTokenMetadataCell;

// Build change metadata message (opcode 4 = change_content)
export function buildChangeMetadataMessage(contentCell: Cell): Cell {
  return beginCell()
    .storeUint(0xcb862902, 32) // change_metadata_url opcode
    .storeUint(0, 64) // query_id
    .storeRef(contentCell)
    .endCell();
}

export { sha256, makeSnakeCell, parseSnakeCell };
