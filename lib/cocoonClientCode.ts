// Cocoon Client Contract Code
// Based on https://github.com/TelegramMessenger/cocoon-contracts
// Code hash: l00kU45gA7Gjk/hwhSW4EyTPiniu6ItFhdUbb2RVUUc=

import { Cell } from '@ton/core';

// Client contract code in base64 (BOC format)
// This should be loaded from the actual contract compilation
// For now, using a placeholder - in production, load from cocoon-contracts repo
const CLIENT_CODE_BOC = '';

export function getClientCode(): Cell {
  if (!CLIENT_CODE_BOC) {
    // Return empty cell as fallback - will need actual code from contract
    // In production, this should fetch from cocoon-contracts repository
    return Cell.fromBase64('');
  }
  
  try {
    return Cell.fromBase64(CLIENT_CODE_BOC);
  } catch (error) {
    console.error('Error parsing client code:', error);
    return Cell.fromBase64('');
  }
}

// Load client code from URL (for production use)
export async function loadClientCodeFromUrl(url: string): Promise<Cell | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load client code: ${response.statusText}`);
    }
    
    const boc = await response.text();
    return Cell.fromBase64(boc);
  } catch (error) {
    console.error('Error loading client code from URL:', error);
    return null;
  }
}

