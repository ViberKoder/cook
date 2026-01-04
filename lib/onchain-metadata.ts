import { beginCell, Cell, Dictionary } from '@ton/core';
import { sha256 } from '@noble/hashes/sha256';

/**
 * TEP-64 On-chain Metadata Builder
 * Based on https://github.com/ton-blockchain/minter-contract
 * Format: 0x00 + Dictionary<SHA256(key), Cell(0x00 + snake_data)>
 */

const ONCHAIN_CONTENT_PREFIX = 0x00;
const OFFCHAIN_CONTENT_PREFIX = 0x01;
const SNAKE_PREFIX = 0x00;

export type JettonMetaDataKeys = 'name' | 'description' | 'image' | 'symbol' | 'decimals';

const jettonOnChainMetadataSpec: {
  [key in JettonMetaDataKeys]: 'utf8' | 'ascii';
} = {
  name: 'utf8',
  description: 'utf8',
  image: 'ascii',
  symbol: 'utf8',
  decimals: 'utf8',
};

export interface JettonMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  decimals: string; // обязательно string, например '9'
}

/**
 * Build TEP-64 on-chain metadata cell
 * Matches minter-contract format exactly
 */
export function buildOnchainMetadataCell(data: { [s: string]: string | undefined }): Cell {
  const dict = Dictionary.empty(Dictionary.Keys.Buffer(32), Dictionary.Values.Cell());

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    
    const encoding = jettonOnChainMetadataSpec[key as JettonMetaDataKeys];
    if (!encoding) return;

    // SHA256 hash of the key
    const keyHash = Buffer.from(sha256(key));
    
    // Encode value
    const valueBuffer = Buffer.from(value, encoding);
    
    // Build value cell with snake format (0x00 prefix + data)
    const CELL_MAX_SIZE_BYTES = 127;
    
    if (valueBuffer.length <= CELL_MAX_SIZE_BYTES - 1) {
      // Single cell
      const cell = beginCell()
        .storeUint(SNAKE_PREFIX, 8)
        .storeBuffer(valueBuffer)
        .endCell();
      dict.set(keyHash, cell);
    } else {
      // Multi-cell snake format
      let remaining = valueBuffer;
      let rootBuilder = beginCell().storeUint(SNAKE_PREFIX, 8);
      
      const firstChunkSize = CELL_MAX_SIZE_BYTES - 1;
      rootBuilder.storeBuffer(remaining.slice(0, firstChunkSize));
      remaining = remaining.slice(firstChunkSize);
      
      let tailCell: Cell | null = null;
      const chunks: Buffer[] = [];
      while (remaining.length > 0) {
        chunks.push(remaining.slice(0, CELL_MAX_SIZE_BYTES));
        remaining = remaining.slice(CELL_MAX_SIZE_BYTES);
      }
      
      for (let i = chunks.length - 1; i >= 0; i--) {
        const builder = beginCell().storeBuffer(chunks[i]);
        if (tailCell) {
          builder.storeRef(tailCell);
        }
        tailCell = builder.endCell();
      }
      
      if (tailCell) {
        rootBuilder.storeRef(tailCell);
      }
      
      dict.set(keyHash, rootBuilder.endCell());
    }
  });

  // Final cell: 0x00 prefix + dictionary
  return beginCell()
    .storeUint(ONCHAIN_CONTENT_PREFIX, 8)
    .storeDict(dict)
    .endCell();
}

/**
 * Build off-chain metadata cell (URL)
 */
export function buildOffchainMetadataCell(uri: string): Cell {
  return beginCell()
    .storeUint(OFFCHAIN_CONTENT_PREFIX, 8)
    .storeStringTail(uri)
    .endCell();
}

// Alias for backward compatibility
export const buildTokenMetadataCell = buildOnchainMetadataCell;

// Legacy functions (not used)
export function buildMetadataUri(metadata: JettonMetadata, contractAddress?: string): string {
  return '';
}
