// Cocoon Contract Wrappers
// Based on https://github.com/TelegramMessenger/cocoon-contracts

import { Address, Cell, beginCell, toNano, contractAddress, storeStateInit } from '@ton/core';
import { TonClient } from '@ton/ton';
import { COCOON_ROOT_ADDRESS } from './cocoonConfig';

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

export interface CocoonClientState {
  balance: bigint;
  stake: bigint;
  tokensUsed: bigint;
  state: number;
  unlockTs: number;
}

// CocoonRoot wrapper
export class CocoonRoot {
  constructor(
    public readonly address: Address,
    public readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address): CocoonRoot {
    return new CocoonRoot(address);
  }

  async getAllParams(client: TonClient): Promise<CocoonRootParams | null> {
    try {
      // Try get_cur_params() method first
      let result;
      try {
        result = await client.runMethod(this.address, 'get_cur_params');
      } catch (methodError: any) {
        console.warn('get_cur_params failed, trying get_cocoon_data:', methodError.message);
        // Fallback to get_cocoon_data
        try {
          result = await client.runMethod(this.address, 'get_cocoon_data');
          if (!result.stack) {
            console.error('No stack returned from get_cocoon_data');
            return null;
          }
          
          // get_cocoon_data returns: (int, int, int, int, int, int, int, int, int, slice)
          // We need to extract params from the slice
          const stack = result.stack;
          // Skip first 9 values (version, last_proxy_seqno, etc.)
          for (let i = 0; i < 9; i++) {
            stack.readBigNumber();
          }
          // Read params from slice
          const paramsSlice = stack.readCell();
          // For now, return default values if we can't parse
          return this.getDefaultParams();
        } catch (fallbackError) {
          console.error('Both methods failed:', fallbackError);
          return this.getDefaultParams();
        }
      }
      
      if (!result.stack) {
        console.error('No stack returned from get_cur_params');
        return this.getDefaultParams();
      }

      const stack = result.stack;
      
      try {
        // Read 14 parameters from stack
        // According to Cocoon docs, get_cur_params returns 14 integers
        const price_per_token = stack.readBigNumber();
        const worker_fee_per_token = stack.readBigNumber();
        const min_proxy_stake = stack.readBigNumber();
        const min_client_stake = stack.readBigNumber();
        const proxy_delay_before_close = stack.readNumber();
        const client_delay_before_close = stack.readNumber();
        const prompt_tokens_price_multiplier = stack.readNumber();
        const cached_tokens_price_multiplier = stack.readNumber();
        const completion_tokens_price_multiplier = stack.readNumber();
        const reasoning_tokens_price_multiplier = stack.readNumber();
        
        // Skip remaining 4 params if they exist
        try {
          stack.readNumber(); // param11
          stack.readNumber(); // param12
          stack.readNumber(); // param13
          stack.readNumber(); // param14
        } catch {
          // Ignore if less than 14 params
        }

        return {
          price_per_token,
          worker_fee_per_token,
          min_proxy_stake,
          min_client_stake,
          proxy_delay_before_close,
          client_delay_before_close,
          prompt_tokens_price_multiplier,
          cached_tokens_price_multiplier,
          completion_tokens_price_multiplier,
          reasoning_tokens_price_multiplier,
        };
      } catch (parseError) {
        console.error('Error parsing Cocoon params from stack:', parseError);
        console.error('Stack remaining:', stack.remaining);
        return this.getDefaultParams();
      }
    } catch (error) {
      console.error('Error getting Cocoon params:', error);
      return this.getDefaultParams();
    }
  }

  private getDefaultParams(): CocoonRootParams {
    // Return default parameters if we can't fetch from contract
    return {
      price_per_token: toNano('0.01'),
      worker_fee_per_token: toNano('0.001'),
      min_proxy_stake: toNano('10'),
      min_client_stake: toNano('1'),
      proxy_delay_before_close: 3600,
      client_delay_before_close: 3600,
      prompt_tokens_price_multiplier: 1,
      cached_tokens_price_multiplier: 1,
      completion_tokens_price_multiplier: 1,
      reasoning_tokens_price_multiplier: 1,
    };
  }

  async getLastProxySeqno(client: TonClient): Promise<number> {
    try {
      const result = await client.runMethod(this.address, 'last_proxy_seqno');
      if (!result.stack) return 0;
      return Number(result.stack.readBigNumber());
    } catch (error) {
      console.error('Error getting last proxy seqno:', error);
      return 0;
    }
  }

  async getProxyInfo(client: TonClient, seqno: number): Promise<CocoonProxyInfo | null> {
    try {
      const result = await client.runMethod(this.address, 'get_proxy_info', [
        { type: 'int', value: BigInt(seqno) }
      ]);
      if (!result.stack) return null;

      // Parse proxy info from stack (simplified - actual structure may differ)
      const stack = result.stack;
      return {
        endpoint: '', // Extract from stack based on actual contract
        pubkey: Buffer.alloc(32),
        state: 0,
        balance: 0n,
        stake: 0n,
      };
    } catch (error) {
      console.error('Error getting proxy info:', error);
      return null;
    }
  }

  async getWorkerHashIsValid(client: TonClient, hash: Buffer): Promise<boolean> {
    try {
      const result = await client.runMethod(this.address, 'worker_hash_is_valid', [
        { type: 'slice', cell: beginCell().storeBuffer(hash).endCell() }
      ]);
      if (!result.stack) return false;
      return result.stack.readBoolean();
    } catch {
      return false;
    }
  }

  async getProxyHashIsValid(client: TonClient, hash: Buffer): Promise<boolean> {
    try {
      const result = await client.runMethod(this.address, 'proxy_hash_is_valid', [
        { type: 'slice', cell: beginCell().storeBuffer(hash).endCell() }
      ]);
      if (!result.stack) return false;
      return result.stack.readBoolean();
    } catch {
      return false;
    }
  }

  async getModelHashIsValid(client: TonClient, hash: Buffer): Promise<boolean> {
    try {
      const result = await client.runMethod(this.address, 'model_hash_is_valid', [
        { type: 'slice', cell: beginCell().storeBuffer(hash).endCell() }
      ]);
      if (!result.stack) return false;
      return result.stack.readBoolean();
    } catch {
      return false;
    }
  }
}

// CocoonClient wrapper
export class CocoonClient {
  constructor(
    public readonly address: Address,
    public readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromConfig(
    config: {
      ownerAddress: Address;
      proxyAddress: Address;
      proxyPublicKey: Buffer;
      state: number;
      balance: bigint;
      stake: bigint;
      tokensUsed: bigint;
      unlockTs: number;
      secretHash: bigint;
      params: Cell;
    },
    code: Cell
  ): CocoonClient {
    const data = beginCell()
      .storeAddress(config.ownerAddress)
      .storeAddress(config.proxyAddress)
      .storeBuffer(config.proxyPublicKey)
      .storeUint(config.state, 2)
      .storeCoins(config.balance)
      .storeCoins(config.stake)
      .storeUint(config.tokensUsed, 64)
      .storeUint(config.unlockTs, 32)
      .storeUint(config.secretHash, 256)
      .storeRef(config.params)
      .endCell();

    const init = { code, data };
    const address = contractAddress(0, init);

    return new CocoonClient(address, init);
  }

  static calculateClientAddress(
    clientCode: Cell,
    proxyAddress: Address,
    proxyPublicKey: Buffer,
    ownerAddress: Address,
    paramsCell: Cell,
    minClientStake: bigint
  ): Address {
    const config = {
      ownerAddress,
      proxyAddress,
      proxyPublicKey,
      state: 0,
      balance: 0n,
      stake: minClientStake,
      tokensUsed: 0n,
      unlockTs: 0,
      secretHash: 0n,
      params: paramsCell,
    };
    const client = CocoonClient.createFromConfig(config, clientCode);
    return client.address;
  }

  async getData(client: TonClient): Promise<CocoonClientState | null> {
    try {
      const result = await client.runMethod(this.address, 'get_cocoon_client_data');
      if (!result.stack) return null;

      const stack = result.stack;
      // Parse ClientData from stack
      // Structure: balance, stake, tokensUsed, state, unlockTs
      return {
        balance: stack.readBigNumber(),
        stake: stack.readBigNumber(),
        tokensUsed: stack.readBigNumber(),
        state: stack.readNumber(),
        unlockTs: stack.readNumber(),
      };
    } catch (error) {
      console.error('Error getting client state:', error);
      return null;
    }
  }
}

// Helper to get Cocoon Root instance
export function getCocoonRoot(): CocoonRoot {
  return CocoonRoot.createFromAddress(Address.parse(COCOON_ROOT_ADDRESS));
}

