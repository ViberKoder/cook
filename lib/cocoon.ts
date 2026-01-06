import { TonClient, Address, toNano, beginCell, contractAddress } from '@ton/ton';
import { KeyPair, sign } from '@ton/crypto';
import { COCOON_ROOT_ADDRESS, TON_CENTER_ENDPOINT, TON_CENTER_API_KEY } from './cocoonConfig';

// Initialize TON client
export function getTonClient(): TonClient {
  return new TonClient({
    endpoint: TON_CENTER_ENDPOINT,
    apiKey: TON_CENTER_API_KEY || undefined,
  });
}

// Parse address helper
export function parseAddr(addr: string): Address {
  return Address.parse(addr);
}

// Format nanoTON to TON
export function formatTON(nano: bigint): string {
  return (Number(nano) / 1e9).toFixed(4) + ' TON';
}

// Cocoon Root Contract Interface
export interface CocoonRootParams {
  price_per_token: bigint;
  worker_fee_per_token: bigint;
  min_proxy_stake: bigint;
  min_client_stake: bigint;
  proxy_delay_before_close: number;
  client_delay_before_close: number;
  prompt_tokens_price_multiplier: number;
  cached_tokens_price_multiplier: number;
  completion_tokens_price_multiplier: number;
  reasoning_tokens_price_multiplier: number;
}

export interface CocoonProxyInfo {
  endpoint: string;
  pubkey: Buffer;
  state: number;
  balance: bigint;
  stake: bigint;
}

// Get all parameters from Root contract
export async function getAllParams(): Promise<CocoonRootParams | null> {
  try {
    const client = getTonClient();
    const rootAddr = parseAddr(COCOON_ROOT_ADDRESS);
    
    const result = await client.runMethod(rootAddr, 'getAllParams');
    
    if (result.exitCode !== 0) {
      return null;
    }

    const stack = result.stack;
    // Read stack items - adjust based on actual contract return format
    // Note: Stack reading order depends on contract implementation
    try {
      return {
        price_per_token: stack.remaining > 0 ? stack.readBigNumber() : 0n,
        worker_fee_per_token: stack.remaining > 0 ? stack.readBigNumber() : 0n,
        min_proxy_stake: stack.remaining > 0 ? stack.readBigNumber() : 0n,
        min_client_stake: stack.remaining > 0 ? stack.readBigNumber() : 0n,
        proxy_delay_before_close: stack.remaining > 0 ? stack.readNumber() : 0,
        client_delay_before_close: stack.remaining > 0 ? stack.readNumber() : 0,
        prompt_tokens_price_multiplier: stack.remaining > 0 ? stack.readNumber() : 0,
        cached_tokens_price_multiplier: stack.remaining > 0 ? stack.readNumber() : 0,
        completion_tokens_price_multiplier: stack.remaining > 0 ? stack.readNumber() : 0,
        reasoning_tokens_price_multiplier: stack.remaining > 0 ? stack.readNumber() : 0,
      };
    } catch (error) {
      console.error('Error reading stack:', error);
      return null;
    }
  } catch (error) {
    console.error('Error getting Cocoon params:', error);
    return null;
  }
}

// Get last proxy seqno
export async function getLastProxySeqno(): Promise<number> {
  try {
    const client = getTonClient();
    const rootAddr = parseAddr(COCOON_ROOT_ADDRESS);
    
    const result = await client.runMethod(rootAddr, 'last_proxy_seqno');
    
    if (result.exitCode !== 0) {
      return 0;
    }

    try {
      return Number(result.stack.readBigNumber());
    } catch {
      return 0;
    }
  } catch (error) {
    console.error('Error getting last proxy seqno:', error);
    return 0;
  }
}

// Get proxy info
export async function getProxyInfo(seqno: number): Promise<CocoonProxyInfo | null> {
  try {
    const client = getTonClient();
    const rootAddr = parseAddr(COCOON_ROOT_ADDRESS);
    
    const result = await client.runMethod(rootAddr, 'get_proxy_info', [{ type: 'int', value: BigInt(seqno) }]);
    
    if (result.exitCode !== 0) {
      return null;
    }

    const stack = result.stack;
    // Parse proxy info from stack
    // This is a simplified version - actual implementation depends on contract structure
    return {
      endpoint: '', // Extract from stack
      pubkey: Buffer.alloc(32), // Extract from stack
      state: 0,
      balance: 0n,
      stake: 0n,
    };
  } catch (error) {
    console.error('Error getting proxy info:', error);
    return null;
  }
}

// Check if hash is valid (worker/proxy/model)
export async function checkHashIsValid(
  hashType: 'worker' | 'proxy' | 'model',
  hash: Buffer
): Promise<boolean> {
  try {
    const client = getTonClient();
    const rootAddr = parseAddr(COCOON_ROOT_ADDRESS);
    
    const methodName = `${hashType}_hash_is_valid`;
    const result = await client.runMethod(rootAddr, methodName, [
      { type: 'slice', cell: beginCell().storeBuffer(hash).endCell() }
    ]);
    
    if (result.exitCode !== 0) return false;
    try {
      return result.stack.readBoolean();
    } catch {
      return false;
    }
  } catch (error) {
    console.error(`Error checking ${hashType} hash:`, error);
    return false;
  }
}

// Cocoon Client Contract Interface
export interface CocoonClientState {
  balance: bigint;
  stake: bigint;
  tokensUsed: bigint;
  state: number;
  unlockTs: number;
}

// Get client contract state
export async function getClientState(clientAddress: string): Promise<CocoonClientState | null> {
  try {
    const client = getTonClient();
    const addr = parseAddr(clientAddress);
    
    const result = await client.runMethod(addr, 'getData');
    
    if (result.exitCode !== 0) {
      return null;
    }

    const stack = result.stack;
    try {
      return {
        balance: stack.remaining > 0 ? stack.readBigNumber() : 0n,
        stake: stack.remaining > 0 ? stack.readBigNumber() : 0n,
        tokensUsed: stack.remaining > 0 ? stack.readBigNumber() : 0n,
        state: stack.remaining > 0 ? stack.readNumber() : 0,
        unlockTs: stack.remaining > 0 ? stack.readNumber() : 0,
      };
    } catch (error) {
      console.error('Error reading client state stack:', error);
      return null;
    }
  } catch (error) {
    console.error('Error getting client state:', error);
    return null;
  }
}

// Calculate client contract address
export function calculateClientAddress(
  clientCode: Buffer,
  proxyAddress: Address,
  proxyPublicKey: Buffer,
  ownerAddress: Address,
  paramsCell: Buffer,
  minClientStake: bigint
): Address {
  // This is a simplified version
  // Actual implementation should use the same logic as CocoonClient.calculateAddress()
  // For now, return a placeholder - in production, use proper contract address calculation
  try {
    const stateInit = beginCell()
      .storeRef(beginCell().storeBuffer(clientCode).endCell())
      .storeRef(
        beginCell()
          .storeAddress(ownerAddress)
          .storeAddress(proxyAddress)
          .storeBuffer(proxyPublicKey)
          .storeUint(0, 2) // state
          .storeCoins(0) // balance
          .storeCoins(minClientStake) // stake
          .storeUint(0, 64) // tokensUsed
          .storeUint(0, 32) // unlockTs
          .storeUint(0, 256) // secretHash
          .storeRef(beginCell().storeBuffer(paramsCell).endCell())
          .endCell()
      )
      .endCell();
    
    return contractAddress(0, stateInit);
  } catch (error) {
    console.error('Error calculating client address:', error);
    // Return a placeholder address
    return Address.parse('EQD4FSw8kPD0Cr8tQ3g5e8fsi8jH9vJ7K2mN1pQ3rS5tU9vW');
  }
}

// Send AI request to Cocoon (simplified - actual implementation requires full Cocoon integration)
export async function sendAIRequest(
  prompt: string,
  clientAddress: string,
  proxyEndpoint: string
): Promise<string> {
  // This is a placeholder - actual implementation would:
  // 1. Connect to Cocoon proxy endpoint
  // 2. Send request with proper authentication
  // 3. Handle streaming response
  // 4. Update client contract balance
  
  try {
    // For now, return a mock response
    // In production, this would make actual API calls to Cocoon proxy
    const response = await fetch(proxyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        client_address: clientAddress,
      }),
    });

    if (!response.ok) {
      throw new Error('AI request failed');
    }

    const data = await response.json();
    return data.response || 'Error: No response from AI';
  } catch (error) {
    console.error('Error sending AI request:', error);
    throw error;
  }
}

