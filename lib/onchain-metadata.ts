/**
 * On-chain metadata builder for Jetton 2.0
 * Based on https://github.com/ton-blockchain/minter-contract/blob/main/build/jetton-minter.deploy.ts
 * 
 * Uses TEP-64 standard:
 * - Prefix 0x00 for on-chain data
 * - SHA-256 hashed keys
 * - Snake format for values (chain of refs for long data)
 * 
 * This is the DIRECT TEP-64 format that Jetton 1.0 uses and that explorers expect.
 * Jetton 2.0 contract should store this format directly, not a URI.
 */

import { beginCell, Cell, Dictionary } from '@ton/core';
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

export interface JettonMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  decimals?: string;
}

/**
 * Build on-chain metadata cell for Jetton 2.0
 * Uses TEP-64 format directly (like Jetton 1.0) for maximum compatibility
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
    // Skip only if truly undefined or empty string
    if (value === undefined || value === null || value === '') {
      console.log(`Skipping metadata key "${key}": value is`, value === undefined ? 'undefined' : value === null ? 'null' : 'empty string');
      continue;
    }
    
    const keyHash = sha256(key);
    const valueBuffer = Buffer.from(value, 'utf-8');
    const valueCell = makeSnakeCell(valueBuffer);
    
    console.log(`✓ Adding metadata key "${key}":`, {
      hash: keyHash.toString('hex').substring(0, 16) + '...',
      valueLength: value.length,
      valuePreview: value.length > 50 ? value.substring(0, 50) + '...' : value,
      valueType: typeof value,
    });
    
    dict.set(keyHash, valueCell);
  }
  
  console.log('Final dictionary size:', dict.size, 'keys added');
  
  // Build the content cell with TEP-64 format
  // Prefix (8 bits) + Dictionary (stored in ref if large)
  const resultCell = beginCell()
    .storeUint(ONCHAIN_CONTENT_PREFIX, 8)
    .storeDict(dict)
    .endCell();
  
  // Verify the cell structure
  const cellBits = resultCell.bits.length;
  const cellRefs = resultCell.refs.length;
  const dictSize = dict.size;
  
  console.log('Metadata cell created (TEP-64 format):', {
    bits: cellBits,
    refs: cellRefs,
    dictSize: dictSize,
    hasDict: dictSize > 0,
  });
  
  // CRITICAL: If dict is empty or not stored correctly, this is a bug
  if (dictSize === 0) {
    console.error('ERROR: Dictionary is empty! No metadata will be stored!');
    throw new Error('Metadata dictionary is empty - check that all values are provided');
  }
  
  // Verify dictionary is actually in the cell
  if (cellBits <= 8 && cellRefs === 0) {
    console.error('ERROR: Cell appears empty! Dictionary may not be stored correctly.');
    console.error('Expected: at least 8 bits (prefix) + dictionary data');
    console.error('Got:', { bits: cellBits, refs: cellRefs });
  }
  
  return resultCell;
}

/**
 * Build off-chain metadata cell from a URL
 * For cases where you have a hosted JSON file
 */
export function buildOffchainMetadataCell(url: string): Cell {
  return beginCell()
    .storeStringRefTail(url)
    .endCell();
}

// Alias for backward compatibility
export const buildOnchainMetadataCell = buildTokenMetadataCell;

