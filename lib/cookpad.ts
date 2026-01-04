import { Address, beginCell, Cell, toNano, contractAddress, storeStateInit } from '@ton/core';
import { SendTransactionParams } from '@/hooks/useTonConnect';

// Cookpad contract constants
const FEE_WALLET = 'UQDjQOdWTP1bPpGpYExAsCcVLGPN_pzGvdno3aCk565ZnQIz';
const MAX_LIQUIDITY_TON = 300;
const FEE_PERCENT = 1;

// Operation codes
const Op = {
  buy_tokens: 0x2593855d,
  sell_tokens: 0xc4c5e33b,
  get_state: 0x2593855e,
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
 */
export async function sendBuyTokensTransaction(
  contractAddress: string,
  tonAmount: string,
  minTokens: string,
  sendTransaction: (params: SendTransactionParams) => Promise<any>
): Promise<void> {
  const amount = toNano(tonAmount);
  const minTokensBN = toNano(minTokens);

  const buyBody = beginCell()
    .storeUint(Op.buy_tokens, 32)
    .storeUint(0, 64) // query_id
    .storeCoins(minTokensBN)
    .endCell();

  await sendTransaction({
    to: contractAddress,
    value: amount.toString(),
    body: buyBody.toBoc().toString('base64'),
  });
}

/**
 * Send sell tokens transaction
 */
export async function sendSellTokensTransaction(
  contractAddress: string,
  tokenAmount: string,
  minTon: string,
  sendTransaction: (params: SendTransactionParams) => Promise<any>
): Promise<void> {
  const minTonBN = toNano(minTon);
  const tokenAmountBN = toNano(tokenAmount);

  const sellBody = beginCell()
    .storeUint(Op.sell_tokens, 32)
    .storeUint(0, 64) // query_id
    .storeCoins(tokenAmountBN)
    .storeCoins(minTonBN)
    .endCell();

  await sendTransaction({
    to: contractAddress,
    value: toNano('0.1').toString(), // Gas fee
    body: sellBody.toBoc().toString('base64'),
  });
}

/**
 * Load cookpad state from contract
 */
export async function loadCookpadState(contractAddress: string): Promise<CookpadState> {
  try {
    // TODO: Call get_state method on contract
    // For now, return placeholder
    return {
      totalLiquidity: '0',
      totalSupply: '0',
      reserve: '0',
      currentPrice: 0,
    };
  } catch (error) {
    console.error('Failed to load cookpad state:', error);
    throw error;
  }
}

export { FEE_WALLET, MAX_LIQUIDITY_TON, FEE_PERCENT, Op };

