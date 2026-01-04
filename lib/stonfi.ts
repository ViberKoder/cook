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
    // Try multiple STON.fi API endpoints
    // Method 1: Try router pools endpoint
    try {
      const routerResponse = await fetch(`https://api.ston.fi/v1/router/pools?token_addresses=${tokenAddress}`);
      if (routerResponse.ok) {
        const routerData = await routerResponse.json();
        const pools = routerData.pools || routerData || [];
        
        for (const pool of pools) {
          if ((pool.token0_address === tokenAddress || pool.token1_address === tokenAddress) &&
              pool.reserve0 && pool.reserve1) {
            const reserve0 = BigInt(pool.reserve0 || '0');
            const reserve1 = BigInt(pool.reserve1 || '0');
            
            if (reserve0 > 0n && reserve1 > 0n) {
              return {
                address: pool.address || pool.pool_address,
                token0: pool.token0_address,
                token1: pool.token1_address,
                reserve0: pool.reserve0,
                reserve1: pool.reserve1,
                lp_total_supply: pool.lp_total_supply || '0',
              };
            }
          }
        }
      }
    } catch (e) {
      console.log('Router API failed, trying alternative');
    }
    
    // Method 2: Try pools endpoint
    try {
      const poolsResponse = await fetch(`https://api.ston.fi/v1/pools?token_addresses=${tokenAddress}`);
      if (poolsResponse.ok) {
        const poolsData = await poolsResponse.json();
        const pools = poolsData.pools || poolsData || [];
        
        for (const pool of pools) {
          if ((pool.token0_address === tokenAddress || pool.token1_address === tokenAddress) &&
              pool.reserve0 && pool.reserve1) {
            const reserve0 = BigInt(pool.reserve0 || '0');
            const reserve1 = BigInt(pool.reserve1 || '0');
            
            if (reserve0 > 0n && reserve1 > 0n) {
              return {
                address: pool.address || pool.pool_address,
                token0: pool.token0_address,
                token1: pool.token1_address,
                reserve0: pool.reserve0,
                reserve1: pool.reserve1,
                lp_total_supply: pool.lp_total_supply || '0',
              };
            }
          }
        }
      }
    } catch (e) {
      console.log('Pools API failed, trying alternative');
    }
    
    // Method 3: Check via TonAPI jetton info (might have pool data)
    return await checkStonfiLiquidityAlternative(tokenAddress);
  } catch (error) {
    console.error('Error checking STON.fi liquidity:', error);
    return await checkStonfiLiquidityAlternative(tokenAddress);
  }
}

/**
 * Alternative method: check via TonAPI and try to find pool
 */
async function checkStonfiLiquidityAlternative(tokenAddress: string): Promise<StonfiPool | null> {
  try {
    // For known tokens, we can assume they have liquidity if they're in our list
    // In production, you should maintain a database of tokens with verified liquidity
    
    // Try to check if token exists and has supply
    const response = await fetch(`https://tonapi.io/v2/jettons/${tokenAddress}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    // If token exists and has supply, check if we can find pool info
    // Try checking STON.fi pools page directly (this is a workaround)
    // In production, you should use STON.fi's official API or maintain your own database
    
    // For now, if token exists and is in our known list, assume it has liquidity
    // This is a temporary solution - in production you'd verify via API
    
    return null;
  } catch (error) {
    console.error('Error in alternative liquidity check:', error);
    return null;
  }
}

/**
 * Check if token is in known list (temporary solution)
 * In production, this should query your database
 */
export function isKnownCookToken(tokenAddress: string): boolean {
  // This should come from your backend/database
  // For now, we'll check against a hardcoded list
  const knownTokens = [
    'EQBkRlirdJlIcPOhuXnOwQjOkAZcIOgHBfFvDf2mUWiqVk-Q',
  ];
  return knownTokens.includes(tokenAddress);
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

