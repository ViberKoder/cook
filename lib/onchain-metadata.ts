/**
 * Jetton 2.0 Metadata Utilities
 * 
 * The Jetton 2.0 contract stores metadata_uri as a snake-encoded string.
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
 * Build metadata URI for Jetton 2.0
 * Creates a data URI containing the JSON metadata inline.
 * This avoids the need for external hosting and works as on-chain metadata.
 */
export function buildMetadataUri(metadata: JettonMetadata): string {
  const jsonMetadata: any = {
    name: metadata.name,
    symbol: metadata.symbol,
    description: metadata.description || metadata.name,
    decimals: metadata.decimals || '9',
  };
  
  // Add image if provided
  if (metadata.image) {
    jsonMetadata.image = metadata.image;
  }
  
  const jsonString = JSON.stringify(jsonMetadata);
  return `data:application/json,${encodeURIComponent(jsonString)}`;
}

/**
 * Build metadata URI cell for Jetton 2.0 contract
 * 
 * This is the correct way to store metadata in Jetton 2.0.
 * The contract will automatically convert this URI to TEP-64 format
 * when get_jetton_data is called.
 * 
 * @param metadata - Token metadata object
 * @returns Cell with metadata URI stored in ref
 */
export function buildTokenMetadataCell(metadata: JettonMetadata): Cell {
  const uri = buildMetadataUri(metadata);
  
  console.log('Building metadata URI:', {
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
  const cell = beginCell()
    .storeStringRefTail(uri)
    .endCell();
  
  console.log('Metadata cell created:', {
    bits: cell.bits.length,
    refs: cell.refs.length,
  });
  
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

