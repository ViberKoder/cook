// Cocoon Client Contract Code
// Based on https://github.com/TelegramMessenger/cocoon-contracts
// Code hash: l00kU45gA7Gjk/hwhSW4EyTPiniu6ItFhdUbb2RVUUc=
// Example deployed contract: EQBRPfbCT0ixgfD-AgV_yGTd2zjxSqLnBVJzW9CFJ9GQvK87

import { Cell, beginCell } from '@ton/core';
import { getTonClient } from './cocoon';
import { Address } from '@ton/core';

// Try to load client code from a known URL or use placeholder
const CLIENT_CODE_URL = process.env.NEXT_PUBLIC_COCOON_CLIENT_CODE_URL || '';

// Example deployed client contract address for code extraction
const EXAMPLE_CLIENT_ADDRESS = 'EQBRPfbCT0ixgfD-AgV_yGTd2zjxSqLnBVJzW9CFJ9GQvK87';

let cachedClientCode: Cell | null = null;

// Load client code from a deployed contract
async function loadFromDeployedContract(address: string): Promise<Cell | null> {
  try {
    const client = getTonClient();
    const contractAddress = Address.parse(address);
    const account = await client.getContractState(contractAddress);
    
    if (account.state === 'active' && account.code) {
      // Extract code from the contract state
      // account.code is a Buffer containing BOC (Bag of Cells), need to convert to Cell
      try {
        // Parse BOC buffer to get cells
        const cells = Cell.fromBoc(account.code);
        if (cells && cells.length > 0) {
          return cells[0];
        }
      } catch (parseError) {
        console.warn('Failed to parse code as BOC:', parseError);
        return null;
      }
    }
  } catch (error) {
    console.warn('Failed to load client code from deployed contract:', error);
  }
  return null;
}

// Try to load from GitHub raw file
async function loadFromGitHub(): Promise<Cell | null> {
  try {
    // Try to load from GitHub raw file (if available)
    const response = await fetch('https://raw.githubusercontent.com/TelegramMessenger/cocoon-contracts/main/wrappers/CocoonClient.code.boc');
    if (response.ok) {
      const text = await response.text();
      // If it's base64, parse it
      if (text.trim().length > 0) {
        try {
          return Cell.fromBase64(text.trim());
        } catch {
          // Try as hex
          return Cell.fromBoc(Buffer.from(text.trim(), 'hex'))[0];
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load from GitHub:', error);
  }
  return null;
}

export async function loadClientCode(): Promise<Cell | null> {
  if (cachedClientCode) {
    return cachedClientCode;
  }

  // Try to load from URL if provided
  if (CLIENT_CODE_URL) {
    try {
      const response = await fetch(CLIENT_CODE_URL);
      if (response.ok) {
        const boc = await response.text();
        cachedClientCode = Cell.fromBase64(boc);
        return cachedClientCode;
      }
    } catch (error) {
      console.warn('Failed to load client code from URL:', error);
    }
  }

  // Try to load from deployed contract (example)
  const deployedCode = await loadFromDeployedContract(EXAMPLE_CLIENT_ADDRESS);
  if (deployedCode) {
    cachedClientCode = deployedCode;
    return cachedClientCode;
  }

  // Try to load from GitHub
  const githubCode = await loadFromGitHub();
  if (githubCode) {
    cachedClientCode = githubCode;
    return githubCode;
  }

  // For now, return a minimal placeholder cell
  // This will allow address calculation but won't work for actual deployment
  // TODO: Load actual client code from cocoon-contracts repository
  console.warn('Using placeholder client code - deployment may fail. Please provide NEXT_PUBLIC_COCOON_CLIENT_CODE_URL or compile the contract.');
  return beginCell().endCell();
}

export function getClientCode(): Cell {
  // Synchronous version - returns placeholder if not loaded
  // In production, should use async loadClientCode() before deployment
  if (cachedClientCode) {
    return cachedClientCode;
  }
  
  // Return minimal cell for address calculation
  // Actual deployment requires real code
  return beginCell().endCell();
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

