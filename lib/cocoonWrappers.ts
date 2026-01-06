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
      const result = await client.runMethod(this.address, 'getAllParams');
      if (!result.stack) return null;

      const stack = result.stack;
      return {
        price_per_token: stack.readBigNumber(),
        worker_fee_per_token: stack.readBigNumber(),
        min_proxy_stake: stack.readBigNumber(),
        min_client_stake: stack.readBigNumber(),
        proxy_delay_before_close: stack.readNumber(),
        client_delay_before_close: stack.readNumber(),
        prompt_tokens_price_multiplier: stack.readNumber(),
        cached_tokens_price_multiplier: stack.readNumber(),
        completion_tokens_price_multiplier: stack.readNumber(),
        reasoning_tokens_price_multiplier: stack.readNumber(),
      };
    } catch (error) {
      console.error('Error getting Cocoon params:', error);
      return null;
    }
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
      const result = await client.runMethod(this.address, 'getData');
      if (!result.stack) return null;

      const stack = result.stack;
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

