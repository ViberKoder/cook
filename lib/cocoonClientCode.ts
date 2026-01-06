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

// Retry helper with exponential backoff for rate limiting
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  initialDelay: number = 2000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error?.response?.status === 429 || error?.status === 429;
      const isLastAttempt = attempt === maxRetries - 1;
      
      if (isRateLimit && !isLastAttempt) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(`Rate limited (429) when loading client code, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// Load client code from a deployed contract
// Fixed: Properly converts account.code Buffer to Cell using BOC parsing
async function loadFromDeployedContract(address: string): Promise<Cell | null> {
  try {
    const client = getTonClient();
    const contractAddress = Address.parse(address);
    
    // Use retry logic for rate limiting
    const account = await retryWithBackoff(async () => {
      return await Promise.race([
        client.getContractState(contractAddress),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
      ]) as any;
    }, 2, 2000);
    
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
  } catch (error: any) {
    // Don't log rate limit errors as warnings - they're expected
    if (error?.response?.status === 429 || error?.status === 429) {
      // Silently handle rate limiting
    } else if (error?.message === 'Timeout' || error?.message?.includes('Timeout')) {
      console.warn('Timeout loading client code from deployed contract');
    } else {
      console.warn('Failed to load client code from deployed contract:', error?.message || error);
    }
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
    // Verify cached code is valid
    if (cachedClientCode.bits.length > 1 || cachedClientCode.refs.length > 0) {
      return cachedClientCode;
    }
    // If cached code is empty, clear cache and reload
    cachedClientCode = null;
  }

  // Try to load from URL if provided
  if (CLIENT_CODE_URL) {
    try {
      const response = await fetch(CLIENT_CODE_URL);
      if (response.ok) {
        const boc = await response.text();
        const code = Cell.fromBase64(boc);
        // Verify code is not empty
        if (code.bits.length > 1 || code.refs.length > 0) {
          cachedClientCode = code;
          return cachedClientCode;
        }
      }
    } catch (error) {
      console.warn('Failed to load client code from URL:', error);
    }
  }

  // Try to load from deployed contract (example)
  try {
    const deployedCode = await loadFromDeployedContract(EXAMPLE_CLIENT_ADDRESS);
    if (deployedCode && (deployedCode.bits.length > 1 || deployedCode.refs.length > 0)) {
      cachedClientCode = deployedCode;
      return cachedClientCode;
    }
  } catch (error) {
    console.warn('Failed to load from deployed contract:', error);
  }

  // Try to load from GitHub
  try {
    const githubCode = await loadFromGitHub();
    if (githubCode && (githubCode.bits.length > 1 || githubCode.refs.length > 0)) {
      cachedClientCode = githubCode;
      return githubCode;
    }
  } catch (error) {
    console.warn('Failed to load from GitHub:', error);
  }

  // Return null instead of empty cell to indicate failure
  console.error('Failed to load client code from all sources. Please provide NEXT_PUBLIC_COCOON_CLIENT_CODE_URL or ensure the example contract is accessible.');
  return null;
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

