// Deploy Cocoon Client Contract
// Based on Cocoon contracts documentation

import { Address, Cell, beginCell, toNano, contractAddress, storeStateInit } from '@ton/core';
import { SendTransactionParams } from '@/hooks/useTonConnect';
import { CocoonClient } from './cocoonWrappers';
import { getCocoonRoot, CocoonRoot } from './cocoonWrappers';
import { getTonClient, parseAddr } from './cocoon';
import { COCOON_ROOT_ADDRESS, COCOON_CODE_HASHES } from './cocoonConfig';
import { getClientCode } from './cocoonClientCode';

// Check if client contract already exists
export async function checkClientExists(clientAddress: Address): Promise<boolean> {
  try {
    const client = getTonClient();
    const account = await client.getContractState(clientAddress);
    return account.state.type === 'active';
  } catch (error) {
    return false;
  }
}

// Find existing client contract for owner
export async function findExistingClient(
  ownerAddress: Address,
  proxyAddress: Address,
  proxyPublicKey: Buffer,
  params: any
): Promise<Address | null> {
  try {
    const client = getTonClient();
    const root = getCocoonRoot();
    
    // Get params cell
    const paramsCell = beginCell()
      .storeCoins(params.price_per_token)
      .storeCoins(params.worker_fee_per_token)
      .storeCoins(params.min_proxy_stake)
      .storeCoins(params.min_client_stake)
      .storeUint(params.proxy_delay_before_close, 32)
      .storeUint(params.client_delay_before_close, 32)
      .storeUint(params.prompt_tokens_price_multiplier, 32)
      .storeUint(params.cached_tokens_price_multiplier, 32)
      .storeUint(params.completion_tokens_price_multiplier, 32)
      .storeUint(params.reasoning_tokens_price_multiplier, 32)
      .endCell();

    // Calculate client address
    const clientCode = getClientCode();
    const clientAddress = CocoonClient.calculateClientAddress(
      clientCode,
      proxyAddress,
      proxyPublicKey,
      ownerAddress,
      paramsCell,
      params.min_client_stake
    );

    // Check if contract exists
    const exists = await checkClientExists(clientAddress);
    return exists ? clientAddress : null;
  } catch (error) {
    console.error('Error finding existing client:', error);
    return null;
  }
}

// Deploy Cocoon Client contract
export async function deployCocoonClientContract(
  ownerAddress: Address,
  sendTransaction: (params: SendTransactionParams) => Promise<any>
): Promise<{ success: boolean; address?: string; error?: string }> {
  try {
    const client = getTonClient();
    const root = getCocoonRoot();
    
    // Get network parameters
    const params = await root.getAllParams(client);
    if (!params) {
      return { success: false, error: 'Failed to get Cocoon parameters' };
    }

    // Get first available proxy
    const lastSeqno = await root.getLastProxySeqno(client);
    if (lastSeqno === 0) {
      return { success: false, error: 'No Cocoon proxies available' };
    }

    // Get proxy info (simplified - in production should get full proxy data)
    const proxyInfo = await root.getProxyInfo(client, 1);
    if (!proxyInfo) {
      return { success: false, error: 'Failed to get proxy info' };
    }

    const proxyAddress = parseAddr(proxyInfo.endpoint || COCOON_ROOT_ADDRESS);
    const proxyPublicKey = proxyInfo.pubkey || Buffer.alloc(32);

    // Check if client already exists
    const existingClient = await findExistingClient(
      ownerAddress,
      proxyAddress,
      proxyPublicKey,
      params
    );

    if (existingClient) {
      return {
        success: true,
        address: existingClient.toString(),
      };
    }

    // Get client code
    const clientCode = getClientCode();
    
    // Create params cell (simplified - should contain actual network params)
    const paramsCell = beginCell()
      .storeCoins(params.price_per_token)
      .storeCoins(params.worker_fee_per_token)
      .storeCoins(params.min_proxy_stake)
      .storeCoins(params.min_client_stake)
      .storeUint(params.proxy_delay_before_close, 32)
      .storeUint(params.client_delay_before_close, 32)
      .storeUint(params.prompt_tokens_price_multiplier, 32)
      .storeUint(params.cached_tokens_price_multiplier, 32)
      .storeUint(params.completion_tokens_price_multiplier, 32)
      .storeUint(params.reasoning_tokens_price_multiplier, 32)
      .endCell();

    // Create client contract
    const cocoonClient = CocoonClient.createFromConfig({
      ownerAddress,
      proxyAddress,
      proxyPublicKey,
      state: 0,
      balance: 0n,
      stake: params.min_client_stake,
      tokensUsed: 0n,
      unlockTs: 0,
      secretHash: 0n,
      params: paramsCell,
    }, clientCode);

    const clientAddress = cocoonClient.address;

    // Build deploy message
    if (!cocoonClient.init) {
      return { success: false, error: 'Failed to create client init' };
    }

    const stateInitCell = beginCell()
      .store(storeStateInit(cocoonClient.init))
      .endCell();

    // Send deploy transaction
    const deployMessage = beginCell()
      .storeUint(0, 32) // op code for deploy
      .storeRef(stateInitCell)
      .endCell();

    await sendTransaction({
      messages: [{
        address: clientAddress.toString(),
        amount: (params.min_client_stake + toNano('0.1')).toString(), // stake + gas
        payload: deployMessage.toBoc().toString('base64'),
      }],
      validUntil: Math.floor(Date.now() / 1000) + 60,
    });

    return {
      success: true,
      address: clientAddress.toString(),
    };
  } catch (error: any) {
    console.error('Error deploying Cocoon client:', error);
    return {
      success: false,
      error: error.message || 'Failed to deploy client contract',
    };
  }
}

