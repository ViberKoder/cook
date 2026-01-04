/**
 * Jetton 2.0 Metadata Utilities
 * 
 * CRITICAL: Jetton 2.0 contract stores metadata_uri as a snake-encoded string in content cell.
 * When get_jetton_data is called, the contract's build_content_cell function
 * creates an on-chain TEP-64 dictionary with:
 *   - "uri" key -> the stored metadata_uri
 *   - "decimals" key -> "9" (hardcoded in contract)
 * 
 * Explorers and DEXes then fetch the JSON from the URI to get:
 *   name, symbol, description, image
 * 
 * IMPORTANT: Must use storeStringRefTail to match jettonContentToCell()
 * from the official wrapper. This stores the URI in a ref, which is required
 * because the contract's build_content_cell adds a 0x00 prefix when building
 * the TEP-64 dictionary. Using storeStringTail would cause cell overflow.
 */

import { beginCell, Cell } from '@ton/core';

export interface JettonMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  decimals?: string;
}

/**
 * Build metadata URI for Jetton 2.0 (off-chain metadata)
 * 
 * Uses API endpoint URL for better explorer compatibility.
 * The API endpoint stores and serves metadata JSON.
 * 
 * IMPORTANT: We use a fixed URL pattern that doesn't include the contract address
 * to avoid circular dependency. The API endpoint will identify the contract
 * by reading the address from the request path.
 * 
 * @param metadata - Token metadata object
 * @param contractAddress - Contract address (optional, for logging only)
 * @returns API endpoint URL
 */
export function buildMetadataUri(metadata: JettonMetadata, contractAddress?: string): string {
  // Use fixed API endpoint URL that doesn't depend on contract address
  // This avoids circular dependency: contract address depends on content cell,
  // but content cell contains URL with contract address
  // The API endpoint will identify the contract from the request path
  const apiUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/jetton-metadata`
    : `https://www.cook.tg/api/jetton-metadata`;
  
  console.log('Using API endpoint for off-chain metadata:', apiUrl, contractAddress ? `(contract: ${contractAddress})` : '');
  
  return apiUrl;
}

/**
 * Build metadata URI cell for Jetton 2.0 contract (off-chain metadata)
 * 
 * CRITICAL: Jetton 2.0 expects URI in content cell, not TEP-64 dictionary directly!
 * The contract will automatically convert this URI to TEP-64 format
 * when get_jetton_data is called.
 * 
 * IMPORTANT: Must use storeStringRefTail to match jettonContentToCell()
 * from the official wrapper. This stores the URI in a ref, which is required
 * because the contract's build_content_cell adds a 0x00 prefix when building
 * the TEP-64 dictionary. Using storeStringTail would cause cell overflow.
 * 
 * @param metadata - Token metadata object
 * @param contractAddress - Contract address (required for off-chain metadata)
 * @returns Cell with metadata URI stored in ref
 */
export function buildTokenMetadataCell(metadata: JettonMetadata, contractAddress: string): Cell {
  const uri = buildMetadataUri(metadata, contractAddress);
  
  console.log('Building metadata URI for Jetton 2.0:', {
    uriLength: uri.length,
    uriPreview: uri.length > 200 ? uri.substring(0, 200) + '...' : uri,
    metadata: {
      name: metadata.name,
      symbol: metadata.symbol,
      hasDescription: !!metadata.description,
      hasImage: !!metadata.image,
    },
  });
  
  // IMPORTANT: Must use storeStringRefTail to match jettonContentToCell()
  // This stores the string in a ref cell, which is required for Jetton 2.0
  const cell = beginCell()
    .storeStringRefTail(uri)
    .endCell();
  
  console.log('Metadata URI cell created:', {
    bits: cell.bits.length,
    refs: cell.refs.length,
    hasRef: cell.refs.length > 0,
  });
  
  // Verify we can read it back
  if (cell.refs.length > 0) {
    const refCell = cell.refs[0];
    const uriFromCell = refCell.beginParse().loadStringTail();
    console.log('Verified URI from cell:', uriFromCell.substring(0, 100) + '...');
  }
  
  return cell;
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

