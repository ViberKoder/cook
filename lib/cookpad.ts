import { Address, beginCell, Cell, toNano, contractAddress, storeStateInit } from '@ton/core';
import { SendTransactionParams } from '@/hooks/useTonConnect';
import { COOKPAD_FEE_WALLET, COOKPAD_MAX_LIQUIDITY_TON, COOKPAD_FEE_PERCENT } from './cookpadConfig';

// Export constants for backward compatibility
export const FEE_WALLET = COOKPAD_FEE_WALLET;
export const MAX_LIQUIDITY_TON = COOKPAD_MAX_LIQUIDITY_TON;
export const FEE_PERCENT = COOKPAD_FEE_PERCENT;

// Operation codes - these are string hashes from the contract
// "op::buy"c hash = sha256("op::buy")
// "op::sell_notification"c hash = sha256("op::sell_notification")
// Using precomputed hashes
const Op = {
  buy: 0x2593855d, // Hash of "op::buy"
  sell_notification: 0xc4c5e33b, // Hash of "op::sell_notification"
  get_bcl_data: 0x2593855e, // Method for getting state
};

export interface CookpadState {
  totalLiquidity: string;
  totalSupply: string;
  reserve: string;
  currentPrice: number;
}

/**
 * Calculate buy price using bonding curve formula
 * Bonding curve: price = k * supply^2
 * For 300 TON max liquidity, we use a quadratic curve
 * Formula: tokens = sqrt(2 * ton_amount / k)
 * Where k is calculated to reach 300 TON at max supply
 */
export function calculateBuyPrice(supply: number, tonAmount: number): number {
  // Quadratic bonding curve: price increases quadratically with supply
  // k = 300 / (max_supply^2), where max_supply is estimated
  // For simplicity, we use: price = base_price * (1 + supply * multiplier)^2
  
  const basePrice = 0.0001; // Base price per token in TON
  const multiplier = 0.00001; // Price multiplier
  
  // Calculate tokens using integral of price function
  // For quadratic curve: tokens = sqrt(2 * ton / k)
  // Simplified: tokens ≈ ton / (base_price * (1 + supply * multiplier))
  const currentPrice = basePrice * Math.pow(1 + supply * multiplier, 2);
  const tokensToMint = tonAmount / currentPrice;
  
  return tokensToMint;
}

/**
 * Calculate sell price (slightly lower than buy price)
 * Uses the same bonding curve but at lower supply
 */
export function calculateSellPrice(supply: number, tokenAmount: number): number {
  const basePrice = 0.0001;
  const multiplier = 0.00001;
  
  // Price at current supply
  const currentPrice = basePrice * Math.pow(1 + supply * multiplier, 2);
  // Price after selling (lower supply)
  const newSupply = supply - tokenAmount;
  const newPrice = basePrice * Math.pow(1 + newSupply * multiplier, 2);
  
  // Average price for the tokens being sold
  const avgPrice = (currentPrice + newPrice) / 2;
  const tonToReceive = tokenAmount * avgPrice;
  
  // Apply 5% spread
  return tonToReceive * 0.95;
}

/**
 * Send buy tokens transaction
 * Message format: op (32), query_id (64), min_receive (coins), destination (msg_addr), custom_payload (maybe_ref)
 */
export async function sendBuyTokensTransaction(
  contractAddress: string,
  tonAmount: string,
  minTokens: string,
  sendTransaction: (params: SendTransactionParams) => Promise<any>,
  destination?: string
): Promise<void> {
  const amount = toNano(tonAmount);
  const minTokensBN = toNano(minTokens);
  
  // If no destination, use address_none (will default to sender)
  const destAddress = destination ? Address.parse(destination) : Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');

  const buyBody = beginCell()
    .storeUint(Op.buy, 32)
    .storeUint(0, 64) // query_id
    .storeCoins(minTokensBN) // min_receive
    .storeAddress(destAddress) // destination (address_none = 0 means use sender)
    .storeMaybeRef(null) // custom_payload
    .endCell();

  await sendTransaction({
    to: contractAddress,
    value: amount.toString(),
    body: buyBody.toBoc().toString('base64'),
  });
}

/**
 * Send sell tokens transaction
 * Note: This should be called from the user's jetton wallet, not directly
 * The wallet will send a sell_notification to the cookpad contract
 * For now, we'll create a message that the wallet should process
 */
export async function sendSellTokensTransaction(
  contractAddress: string,
  tokenAmount: string,
  minTon: string,
  sendTransaction: (params: SendTransactionParams) => Promise<any>,
  ownerAddress?: string
): Promise<void> {
  const minTonBN = toNano(minTon);
  const tokenAmountBN = toNano(tokenAmount);
  
  // This is a placeholder - actual sell should go through jetton wallet
  // The wallet will send sell_notification to cookpad
  const sellBody = beginCell()
    .storeUint(Op.sell_notification, 32)
    .storeUint(0, 64) // query_id
    .storeCoins(tokenAmountBN) // jetton_amount
    .storeCoins(minTonBN) // min_ton_amount
    .storeAddress(ownerAddress ? Address.parse(ownerAddress) : Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c')) // owner_address
    .storeMaybeRef(null) // custom_payload
    .endCell();

  await sendTransaction({
    to: contractAddress,
    value: toNano('0.1').toString(), // Gas fee
    body: sellBody.toBoc().toString('base64'),
  });
}

/**
 * Load cookpad state from contract
 * Uses get_bcl_data method to get contract state
 */
export async function loadCookpadState(contractAddress: string): Promise<CookpadState> {
  try {
    // Call get_bcl_data method on contract
    const response = await fetch(`https://tonapi.io/v2/blockchain/accounts/${contractAddress}/methods/get_bcl_data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      const data = await response.json();
      // Parse response - get_bcl_data returns multiple values
      // Format: (dex_type, total_supply, threshold_supply, ...)
      const stack = data.stack || [];
      
      if (stack.length >= 13) {
        const totalSupply = stack[1]?.value || '0';
        const tonLiqCollected = stack[12]?.value || '0';
        
        // Calculate current price
        const totalSupplyNum = parseFloat(totalSupply) / 1e9;
        const tonLiqNum = parseFloat(tonLiqCollected) / 1e9;
        const currentPrice = totalSupplyNum > 0 ? tonLiqNum / totalSupplyNum : 0;
        
        return {
          totalLiquidity: tonLiqCollected,
          totalSupply: totalSupply,
          reserve: tonLiqCollected, // Reserve is same as collected liquidity
          currentPrice: currentPrice,
        };
      }
    }
    
    // Fallback: try to get basic info from TonAPI
    const basicResponse = await fetch(`https://tonapi.io/v2/blockchain/accounts/${contractAddress}`);
    if (basicResponse.ok) {
      const basicData = await basicResponse.json();
      return {
        totalLiquidity: '0',
        totalSupply: '0',
        reserve: '0',
        currentPrice: 0,
      };
    }
    
    throw new Error('Failed to load cookpad state');
  } catch (error) {
    console.error('Failed to load cookpad state:', error);
    // Return default state instead of throwing
    return {
      totalLiquidity: '0',
      totalSupply: '0',
      reserve: '0',
      currentPrice: 0,
    };
  }
}

export { Op };

