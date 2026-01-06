// Deploy Cocoon Client Contract
// Based on Cocoon contracts documentation

import { Address, Cell, beginCell, toNano, contractAddress, storeStateInit } from '@ton/core';
import { SendTransactionParams } from '@/hooks/useTonConnect';
import { CocoonClient } from './cocoonWrappers';
import { getCocoonRoot, CocoonRoot } from './cocoonWrappers';
import { getTonClient, parseAddr } from './cocoon';
import { COCOON_ROOT_ADDRESS, COCOON_CODE_HASHES } from './cocoonConfig';
import { getClientCode, loadClientCode } from './cocoonClientCode';

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
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// Check if client contract already exists
export async function checkClientExists(clientAddress: Address): Promise<boolean> {
  try {
    const client = getTonClient();
    
    // Use retry logic for rate limiting and increase timeout
    const account = await retryWithBackoff(async () => {
      return await Promise.race([
        client.getContractState(clientAddress),
        new Promise<any>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 15000); // Increased to 15s
        })
      ]);
    }, 2, 2000);
    
    return account.state === 'active';
  } catch (error: any) {
    // Don't log rate limit errors - they're expected
    if (error?.response?.status !== 429 && error?.status !== 429) {
      if (error?.message === 'Timeout' || error?.message?.includes('Timeout')) {
        // Timeout is expected in some cases
      } else {
        console.warn('checkClientExists error:', error?.message || error);
      }
    }
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
    
    // Get params cell
    // Note: multipliers might be large, so we use 64 bits for them
    const paramsCell = beginCell()
      .storeCoins(params.price_per_token)
      .storeCoins(params.worker_fee_per_token)
      .storeCoins(params.min_proxy_stake)
      .storeCoins(params.min_client_stake)
      .storeUint(params.proxy_delay_before_close, 32)
      .storeUint(params.client_delay_before_close, 32)
      .storeUint(BigInt(params.prompt_tokens_price_multiplier || 1), 64)
      .storeUint(BigInt(params.cached_tokens_price_multiplier || 1), 64)
      .storeUint(BigInt(params.completion_tokens_price_multiplier || 1), 64)
      .storeUint(BigInt(params.reasoning_tokens_price_multiplier || 1), 64)
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

    // Check if contract exists (with timeout)
    // checkClientExists already has timeout and retry logic, so just call it
    try {
      const exists = await checkClientExists(clientAddress);
      return exists ? clientAddress : null;
    } catch (checkError: any) {
      // Don't log rate limit errors
      if (checkError?.response?.status !== 429 && checkError?.status !== 429) {
        console.warn('Error checking client existence:', checkError?.message || checkError);
      }
      return null;
    }
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
    // Try to get from contract, but use fallback if needed
    let proxyAddress: Address;
    let proxyPublicKey: Buffer;
    
    try {
      const lastSeqno = await root.getLastProxySeqno(client);
      if (lastSeqno > 0) {
        const proxyInfo = await root.getProxyInfo(client, 1);
        if (proxyInfo && proxyInfo.endpoint) {
          try {
            proxyAddress = parseAddr(proxyInfo.endpoint);
            proxyPublicKey = proxyInfo.pubkey || Buffer.alloc(32);
          } catch {
            // If endpoint is not an address, use root address
            proxyAddress = parseAddr(COCOON_ROOT_ADDRESS);
            proxyPublicKey = proxyInfo.pubkey || Buffer.alloc(32);
          }
        } else {
          proxyAddress = parseAddr(COCOON_ROOT_ADDRESS);
          proxyPublicKey = Buffer.alloc(32);
        }
      } else {
        // No proxies in contract, use root address as fallback
        console.warn('No proxies found in contract, using root address as fallback');
        proxyAddress = parseAddr(COCOON_ROOT_ADDRESS);
        proxyPublicKey = Buffer.alloc(32);
      }
    } catch (proxyError) {
      console.warn('Error getting proxy from contract, using root address:', proxyError);
      // Fallback: use root address
      proxyAddress = parseAddr(COCOON_ROOT_ADDRESS);
      proxyPublicKey = Buffer.alloc(32);
    }

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

    // Try to load client code (async)
    let clientCode = await loadClientCode();
    
    // If async load failed, try sync version
    if (!clientCode || clientCode.bits.length === 0) {
      clientCode = getClientCode();
    }
    
    // Check if client code is valid (not empty)
    // A valid code cell should have at least some bits or refs
    const isEmpty = !clientCode || 
      (clientCode.bits.length === 0 && clientCode.refs.length === 0) ||
      (clientCode.bits.length === 1 && !clientCode.bits.at(0) && clientCode.refs.length === 0);
    
    if (isEmpty) {
      console.error('Client code is empty - cannot deploy without contract code');
      console.warn('Attempting to load from deployed contract...');
      
      // Try one more time to load from deployed contract
      try {
        const { loadFromDeployedContract } = await import('./cocoonClientCode');
        const deployedCode = await loadFromDeployedContract('EQBRPfbCT0ixgfD-AgV_yGTd2zjxSqLnBVJzW9CFJ9GQvK87');
        if (deployedCode && deployedCode.bits.length > 0) {
          clientCode = deployedCode;
          console.log('Successfully loaded client code from deployed contract');
        } else {
          return { 
            success: false, 
            error: 'Client contract code not available. Please ensure NEXT_PUBLIC_COCOON_CLIENT_CODE_URL is set or the example contract is accessible.' 
          };
        }
      } catch (loadError) {
        console.error('Failed to load client code:', loadError);
        return { 
          success: false, 
          error: 'Client contract code not available. Cocoon client code needs to be loaded from cocoon-contracts repository. Please set NEXT_PUBLIC_COCOON_CLIENT_CODE_URL environment variable.' 
        };
      }
    }
    
    // Create params cell (simplified - should contain actual network params)
    // Note: multipliers might be large, so we use 64 bits for them
    const paramsCell = beginCell()
      .storeCoins(params.price_per_token)
      .storeCoins(params.worker_fee_per_token)
      .storeCoins(params.min_proxy_stake)
      .storeCoins(params.min_client_stake)
      .storeUint(params.proxy_delay_before_close, 32)
      .storeUint(params.client_delay_before_close, 32)
      .storeUint(BigInt(params.prompt_tokens_price_multiplier || 1), 64)
      .storeUint(BigInt(params.cached_tokens_price_multiplier || 1), 64)
      .storeUint(BigInt(params.completion_tokens_price_multiplier || 1), 64)
      .storeUint(BigInt(params.reasoning_tokens_price_multiplier || 1), 64)
      .endCell();

    // Convert proxyPublicKey Buffer to bigint if needed
    // CocoonClient.createFromConfig handles both Buffer and bigint
    const cocoonClient = CocoonClient.createFromConfig({
      ownerAddress,
      proxyAddress,
      proxyPublicKey, // Can be Buffer or bigint
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

    // Create stateInit properly for TonConnect
    // TonConnect expects stateInit as a serialized BOC
    const stateInit = cocoonClient.init;
    
    if (!stateInit) {
      return { success: false, error: 'Failed to create client init' };
    }

    // Use storeStateInit helper for proper serialization
    // storeStateInit correctly serializes stateInit: split_depth + special + code + data
    // Note: storeStateInit returns a Cell, so we can use it directly
    // storeStateInit already formats the stateInit correctly, no need to wrap in beginCell
    const stateInitCell = beginCell()
      .store(storeStateInit(stateInit))
      .endCell();

    // Serialize stateInit to base64 BOC for TonConnect
    // TonConnect expects stateInit as a base64-encoded BOC
    const stateInitBoc = stateInitCell.toBoc().toString('base64');

    // For deployment with stateInit, body should be empty or minimal
    // Some wallets may reject completely empty body, so use minimal message
    // Try empty first, but have alternative ready
    let deployMessage = beginCell().endCell();
    let deployBodyBoc = deployMessage.toBoc().toString('base64');
    
    // Alternative: if empty body causes issues, use a minimal init message with op code 0
    // This is more compatible with some wallets
    const alternativeBody = beginCell().storeUint(0, 32).endCell();
    const alternativeBodyBoc = alternativeBody.toBoc().toString('base64');

    // Calculate total value needed: stake + gas fees
    const totalValue = params.min_client_stake + toNano('0.15'); // stake + extra gas for deployment

    console.log('Deploying client contract:', {
      address: clientAddress.toString(),
      value: totalValue.toString(),
      stake: params.min_client_stake.toString(),
      hasStateInit: !!stateInit,
      stateInitLength: stateInitBoc.length,
    });

    try {
      // Try with empty body first
      try {
        await sendTransaction({
          to: clientAddress.toString(),
          value: totalValue.toString(),
          stateInit: stateInitBoc,
          body: deployBodyBoc,
        });
        console.log('Deploy transaction sent successfully with empty body');
      } catch (emptyBodyError: any) {
        // If empty body fails, try with minimal body
        console.warn('Empty body failed, trying with minimal body:', emptyBodyError.message);
        await sendTransaction({
          to: clientAddress.toString(),
          value: totalValue.toString(),
          stateInit: stateInitBoc,
          body: alternativeBodyBoc,
        });
        console.log('Deploy transaction sent successfully with minimal body');
      }
    } catch (txError: any) {
      console.error('Transaction error:', txError);
      // Provide more detailed error message
      const errorMsg = txError.message || 'Transaction failed';
      const detailedError = errorMsg.includes('cancel') || errorMsg.includes('reject') 
        ? `${errorMsg}. Please check: 1) Sufficient balance (need ${totalValue.toString()} nanoTON), 2) Network connection, 3) Wallet permissions`
        : errorMsg;
      return {
        success: false,
        error: detailedError,
      };
    }

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

