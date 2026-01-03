import { beginCell, Cell } from '@ton/core';

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
 */

export interface JettonMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  decimals: number;
}

/**
 * Build metadata URI for Jetton 2.0
 * Creates a data URI containing the JSON metadata inline.
 * This avoids the need for external hosting.
 */
export function buildMetadataUri(metadata: JettonMetadata): string {
  const jsonMetadata = {
    name: metadata.name,
    symbol: metadata.symbol,
    description: metadata.description || metadata.name,
    image: metadata.image || '',
    decimals: metadata.decimals.toString(),
  };
  
  const jsonString = JSON.stringify(jsonMetadata);
  return `data:application/json,${encodeURIComponent(jsonString)}`;
}

/**
 * Build metadata URI cell for Jetton 2.0 contract
 * 
 * IMPORTANT: Must use storeStringRefTail to match jettonContentToCell()
 * from the official wrapper. This stores the URI in a ref, which is required
 * because the contract's build_content_cell adds a 0x00 prefix when building
 * the TEP-64 dictionary. Using storeStringTail would cause cell overflow.
 */
export function buildMetadataUriCell(metadata: JettonMetadata): Cell {
  const uri = buildMetadataUri(metadata);
  return beginCell()
    .storeStringRefTail(uri)
    .endCell();
}

/**
 * Build off-chain metadata cell from a URL
 * For cases where you have a hosted JSON file
 * 
 * IMPORTANT: Must use storeStringRefTail (see buildMetadataUriCell comment)
 */
export function buildOffchainMetadataCell(url: string): Cell {
  return beginCell()
    .storeStringRefTail(url)
    .endCell();
}

// Legacy export for compatibility
export function buildOnchainMetadata(metadata: JettonMetadata): Cell {
  return buildMetadataUriCell(metadata);
}

export function buildOffchainMetadata(url: string): Cell {
  return buildOffchainMetadataCell(url);
}
