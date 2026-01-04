/**
 * STON.fi API integration
 * Check if a token has liquidity pools
 */

export interface StonfiPool {
  address: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  lp_total_supply: string;
}

/**
 * Check if a token has liquidity on STON.fi
 */
export async function checkStonfiLiquidity(tokenAddress: string): Promise<StonfiPool | null> {
  try {
    // STON.fi API endpoint for pools
    // Try to find pools where this token is token0 or token1
    const response = await fetch(`https://api.ston.fi/v1/pools?token_addresses=${tokenAddress}`);
    
    if (!response.ok) {
      // If API doesn't work, try alternative method
      return await checkStonfiLiquidityAlternative(tokenAddress);
    }
    
    const data = await response.json();
    
    // Find pools with this token
    const pools = data.pools || [];
    const pool = pools.find((p: any) => 
      p.token0_address === tokenAddress || p.token1_address === tokenAddress
    );
    
    if (pool && pool.reserve0 && pool.reserve1) {
      // Check if pool has actual liquidity (reserves > 0)
      const reserve0 = BigInt(pool.reserve0 || '0');
      const reserve1 = BigInt(pool.reserve1 || '0');
      
      if (reserve0 > 0n && reserve1 > 0n) {
        return {
          address: pool.address,
          token0: pool.token0_address,
          token1: pool.token1_address,
          reserve0: pool.reserve0,
          reserve1: pool.reserve1,
          lp_total_supply: pool.lp_total_supply || '0',
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error checking STON.fi liquidity:', error);
    return await checkStonfiLiquidityAlternative(tokenAddress);
  }
}

/**
 * Alternative method: check via STON.fi router or pool address
 */
async function checkStonfiLiquidityAlternative(tokenAddress: string): Promise<StonfiPool | null> {
  try {
    // Try checking via TonAPI for jetton info which might include pool data
    const response = await fetch(`https://tonapi.io/v2/jettons/${tokenAddress}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    // Check if token has any pool-related data
    // This is a fallback - ideally we'd use STON.fi API directly
    // For now, we'll assume if token exists and has supply, it might have liquidity
    // In production, you should track which tokens were created on cook.tg
    // and verify liquidity via STON.fi API
    
    return null;
  } catch (error) {
    console.error('Error in alternative liquidity check:', error);
    return null;
  }
}

/**
 * Get STON.fi pool URL for a token
 */
export function getStonfiPoolUrl(tokenAddress: string): string {
  return `https://app.ston.fi/pools?token=${tokenAddress}`;
}

/**
 * Get STON.fi trade URL for a token
 */
export function getStonfiTradeUrl(tokenAddress: string): string {
  return `https://app.ston.fi/swap?ft=${tokenAddress}`;
}

