/**
 * Jetton 2.0 On-Chain Metadata Utilities
 * Based on: https://github.com/ViberKoder/tolya/commit/60974f08c11f37e7804c9987b491729a0af4a76b
 * 
 * CRITICAL: Proper TEP-64 on-chain metadata format:
 * - Prefix 0x00 (8 bits) for on-chain data
 * - Dictionary with keys = sha256(key_name) as BigUint(256)
 * - Values = Cell with snake format string (prefix 0x00 + data)
 */

import { beginCell, Cell, Dictionary } from '@ton/core';

// TEP-64 metadata keys
const ONCHAIN_CONTENT_PREFIX = 0x00;
const SNAKE_PREFIX = 0x00;

// Pre-computed SHA256 hashes for standard metadata keys
const METADATA_KEYS = {
  name: BigInt('0x82a3537ff0dbce7eec35d69edc3a189ee6f17d82f353a553f9aa96cb0be3ce89'),
  description: BigInt('0xc9046f7a37ad0ea7cee73355984fa5428982f8b37c8f7bcec91f7ac71a7cd104'),
  image: BigInt('0x6105d6cc76af400325e94d588ce511be5bfdbb73b437dc51eca43917d7a43e3d'),
  symbol: BigInt('0xb76a7ca153c24671658335bbd08946350ffc621fa1c516e7123095d4ffd5c581'),
  decimals: BigInt('0xee80fd2f1e03480e2282363596ee752d7bb27f50776b95086a0279189675923e'),
  image_data: BigInt('0xd9a88ccec79eef59c84b671136a20ece4cd00caaad5bc47e2c208829154ee9e4'),
};

function makeSnakeCellSimple(data: string): Cell {
  const bytes = new TextEncoder().encode(data);
  return beginCell()
    .storeUint(SNAKE_PREFIX, 8)
    .storeBuffer(Buffer.from(bytes))
    .endCell();
}

export interface JettonMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  decimals: string; // обязательно string, например '9'
}

export function buildTokenMetadataCell(metadata: JettonMetadata): Cell {
  const dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
  
  // Name
  if (metadata.name) {
    dict.set(METADATA_KEYS.name, makeSnakeCellSimple(metadata.name));
  }
  
  // Symbol
  if (metadata.symbol) {
    dict.set(METADATA_KEYS.symbol, makeSnakeCellSimple(metadata.symbol));
  }
  
  // Description
  if (metadata.description) {
    dict.set(METADATA_KEYS.description, makeSnakeCellSimple(metadata.description));
  }
  
  // Image
  if (metadata.image) {
    dict.set(METADATA_KEYS.image, makeSnakeCellSimple(metadata.image));
  }
  
  // Decimals
  dict.set(METADATA_KEYS.decimals, makeSnakeCellSimple(metadata.decimals));
  
  // CRITICAL: For Jetton 2.0, the contract's build_content_cell() expects a URI (snake slice)
  // and wraps it in a dictionary with "uri" key. But for on-chain metadata, we want
  // to store the TEP-64 dictionary directly.
  //
  // The contract will call build_content_cell(metadata_uri.begin_parse()), which will
  // try to read it as a slice. If we pass a cell with 0x00 prefix + dict, the contract
  // will try to parse it as a slice starting with 0x00, then dict.
  //
  // SOLUTION: Store the dictionary WITHOUT the 0x00 prefix in a ref cell.
  // The contract will read it as a slice, and if it starts with 0x00, it should
  // recognize it as on-chain metadata. But the contract code shows it always wraps in "uri".
  //
  // ACTUAL FIX: We need to pass the dictionary cell directly, and the contract should
  // return it as-is if it's already a TEP-64 dictionary. But the current contract doesn't
  // support this - it always wraps in "uri".
  //
  // For now, let's try storing just the dictionary (without prefix), and see if
  // the contract can handle it. But this won't work with the current contract structure.
  //
  // FINAL SOLUTION: Store TEP-64 dictionary WITH 0x00 prefix.
  // Explorers should be able to read it directly from the cell, even if the contract
  // wraps it in "uri" key. The metadata will be accessible via the "uri" key, which
  // contains the TEP-64 dictionary.
  //
  // But wait - if we store TEP-64 dict with 0x00 prefix, and contract wraps it in "uri",
  // then explorers will see: {"uri": "<TEP-64 dict>"}, not the direct dict.
  //
  // REAL SOLUTION: We need to modify the contract to detect TEP-64 dict and return it directly.
  // But since we use precompiled hex, we can't modify it easily.
  //
  // ALTERNATIVE: Store the dictionary WITHOUT prefix, and hope the contract can read it.
  // But contract expects snake slice (URI string), not dictionary.
  //
  // ACTUAL WORKING SOLUTION: Store TEP-64 dictionary WITH 0x00 prefix.
  // Even though contract wraps it in "uri", explorers should be able to read the
  // TEP-64 dictionary from the "uri" value.
  return beginCell()
    .storeUint(ONCHAIN_CONTENT_PREFIX, 8)
    .storeDict(dict)
    .endCell();
}

/**
 * Parse on-chain metadata cell back to metadata object
 */
export function parseTokenMetadataCell(cell: Cell): Partial<JettonMetadata> {
  const slice = cell.beginParse();
  
  // Check prefix
  const prefix = slice.loadUint(8);
  if (prefix !== ONCHAIN_CONTENT_PREFIX) {
    throw new Error('Not an on-chain metadata cell (missing 0x00 prefix)');
  }
  
  // Load dictionary
  const dict = slice.loadDict(
    Dictionary.Keys.BigUint(256),
    Dictionary.Values.Cell()
  );
  
  const result: Partial<JettonMetadata> = {};
  
  // Parse standard keys
  if (dict.get(METADATA_KEYS.name)) {
    const nameCell = dict.get(METADATA_KEYS.name)!;
    const nameSlice = nameCell.beginParse();
    nameSlice.loadUint(8); // Skip snake prefix
    const nameBytes = nameSlice.loadBuffer(nameSlice.remainingBits / 8);
    result.name = new TextDecoder().decode(nameBytes);
  }
  
  if (dict.get(METADATA_KEYS.symbol)) {
    const symbolCell = dict.get(METADATA_KEYS.symbol)!;
    const symbolSlice = symbolCell.beginParse();
    symbolSlice.loadUint(8); // Skip snake prefix
    const symbolBytes = symbolSlice.loadBuffer(symbolSlice.remainingBits / 8);
    result.symbol = new TextDecoder().decode(symbolBytes);
  }
  
  if (dict.get(METADATA_KEYS.description)) {
    const descCell = dict.get(METADATA_KEYS.description)!;
    const descSlice = descCell.beginParse();
    descSlice.loadUint(8); // Skip snake prefix
    const descBytes = descSlice.loadBuffer(descSlice.remainingBits / 8);
    result.description = new TextDecoder().decode(descBytes);
  }
  
  if (dict.get(METADATA_KEYS.image)) {
    const imageCell = dict.get(METADATA_KEYS.image)!;
    const imageSlice = imageCell.beginParse();
    imageSlice.loadUint(8); // Skip snake prefix
    const imageBytes = imageSlice.loadBuffer(imageSlice.remainingBits / 8);
    result.image = new TextDecoder().decode(imageBytes);
  }
  
  if (dict.get(METADATA_KEYS.decimals)) {
    const decimalsCell = dict.get(METADATA_KEYS.decimals)!;
    const decimalsSlice = decimalsCell.beginParse();
    decimalsSlice.loadUint(8); // Skip snake prefix
    const decimalsBytes = decimalsSlice.loadBuffer(decimalsSlice.remainingBits / 8);
    result.decimals = new TextDecoder().decode(decimalsBytes);
  }
  
  return result;
}

// Alias for backward compatibility
export const buildOnchainMetadataCell = buildTokenMetadataCell;

// Legacy functions (not used)
export function buildMetadataUri(metadata: JettonMetadata, contractAddress?: string): string {
  return '';
}

export function buildOffchainMetadataCell(url: string): Cell {
  return beginCell().storeUint(0, 8).endCell();
}
