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
 * Check liquidity via DYOR.io official API
 * Documentation: https://docs.dyor.io/rest-api/jettonsservice/getjettons
 * Returns liquidity value in USD and optional pool address
 */
async function checkDyorLiquidity(tokenAddress: string): Promise<{ liquidity: number; poolAddress?: string } | null> {
  try {
    // Normalize address format - DYOR.io uses EQ format
    const normalizedEQ = tokenAddress.replace(/^UQ/, 'EQ');
    
    // Use official DYOR.io API: GET /v1/jettons with address parameter
    // According to docs: https://docs.dyor.io/rest-api/jettonsservice/getjettons
    const apiUrl = `https://api.dyor.io/v1/jettons?address=${normalizedEQ}`;
    
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(5000),
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Check if jettons array exists and has data
      if (data.jettons && Array.isArray(data.jettons) && data.jettons.length > 0) {
        const jetton = data.jettons[0];
        
        // Extract liquidity from liquidityUsd field
        // Format: { "value": "1000500000", "decimals": 9 }
        if (jetton.liquidityUsd) {
          const liquidityValue = jetton.liquidityUsd.value || jetton.liquidityUsd;
          const liquidityDecimals = jetton.liquidityUsd.decimals || 9;
          
          // Calculate liquidity in USD
          const liquidityNum = typeof liquidityValue === 'string'
            ? parseFloat(liquidityValue) / (10 ** liquidityDecimals)
            : parseFloat(liquidityValue);
          
          if (liquidityNum > 0) {
            console.log(`DYOR.io API found liquidity for ${tokenAddress}: $${liquidityNum}`);
            return {
              liquidity: liquidityNum,
              poolAddress: jetton.poolAddress || jetton.pool_address,
            };
          }
        }
      }
    } else {
      console.log(`DYOR.io API returned status ${response.status} for ${tokenAddress}`);
    }
  } catch (e) {
    console.log('DYOR.io API check failed:', e);
  }
  
  return null;
}

/**
 * Check if a token has liquidity on STON.fi
 */
export async function checkStonfiLiquidity(tokenAddress: string): Promise<StonfiPool | null> {
  try {
    // Normalize address format - try both UQ and EQ formats
    const normalizedEQ = tokenAddress.replace(/^UQ/, 'EQ');
    const normalizedUQ = tokenAddress.replace(/^EQ/, 'UQ');
    const addressesToTry = [normalizedEQ, normalizedUQ, tokenAddress];
    
    console.log(`Checking liquidity for token: ${tokenAddress} (trying: ${addressesToTry.join(', ')})`);
    
    // Try multiple STON.fi API endpoints with different address formats
    for (const address of addressesToTry) {
      // Method 1: Try router pools endpoint
      try {
        const routerResponse = await fetch(`https://api.ston.fi/v1/router/pools?token_addresses=${address}`, {
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        if (routerResponse.ok) {
          const routerData = await routerResponse.json();
          const pools = Array.isArray(routerData) ? routerData : (routerData.pools || routerData.data || []);
          
          console.log(`Router API response for ${address}:`, pools.length, 'pools found');
          
          for (const pool of pools) {
            const token0 = pool.token0_address || pool.token0 || pool.token0Address;
            const token1 = pool.token1_address || pool.token1 || pool.token1Address;
            
            // Check if token matches (try both formats)
            const matches = 
              (token0 && (token0 === address || token0 === normalizedEQ || token0 === normalizedUQ)) ||
              (token1 && (token1 === address || token1 === normalizedEQ || token1 === normalizedUQ));
            
            if (matches && pool.reserve0 && pool.reserve1) {
              const reserve0 = BigInt(pool.reserve0 || '0');
              const reserve1 = BigInt(pool.reserve1 || '0');
              
              if (reserve0 > 0n && reserve1 > 0n) {
                console.log(`Found pool for ${address}:`, pool.address || pool.pool_address);
                return {
                  address: pool.address || pool.pool_address || pool.poolAddress || '',
                  token0: token0,
                  token1: token1,
                  reserve0: pool.reserve0,
                  reserve1: pool.reserve1,
                  lp_total_supply: pool.lp_total_supply || pool.lpTotalSupply || '0',
                };
              }
            }
          }
        }
      } catch (e) {
        console.log(`Router API failed for ${address}:`, e);
      }
      
      // Method 2: Try pools endpoint
      try {
        const poolsResponse = await fetch(`https://api.ston.fi/v1/pools?token_addresses=${address}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (poolsResponse.ok) {
          const poolsData = await poolsResponse.json();
          const pools = Array.isArray(poolsData) ? poolsData : (poolsData.pools || poolsData.data || []);
          
          console.log(`Pools API response for ${address}:`, pools.length, 'pools found');
          
          for (const pool of pools) {
            const token0 = pool.token0_address || pool.token0 || pool.token0Address;
            const token1 = pool.token1_address || pool.token1 || pool.token1Address;
            
            const matches = 
              (token0 && (token0 === address || token0 === normalizedEQ || token0 === normalizedUQ)) ||
              (token1 && (token1 === address || token1 === normalizedEQ || token1 === normalizedUQ));
            
            if (matches && pool.reserve0 && pool.reserve1) {
              const reserve0 = BigInt(pool.reserve0 || '0');
              const reserve1 = BigInt(pool.reserve1 || '0');
              
              if (reserve0 > 0n && reserve1 > 0n) {
                console.log(`Found pool for ${address}:`, pool.address || pool.pool_address);
                return {
                  address: pool.address || pool.pool_address || pool.poolAddress || '',
                  token0: token0,
                  token1: token1,
                  reserve0: pool.reserve0,
                  reserve1: pool.reserve1,
                  lp_total_supply: pool.lp_total_supply || pool.lpTotalSupply || '0',
                };
              }
            }
          }
        }
      } catch (e) {
        console.log(`Pools API failed for ${address}:`, e);
      }
      
      // Method 3: Try router v2
      try {
        const routerV2Response = await fetch(`https://api.ston.fi/v2/pools?token_addresses=${address}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (routerV2Response.ok) {
          const routerV2Data = await routerV2Response.json();
          const pools = Array.isArray(routerV2Data) ? routerV2Data : (routerV2Data.pools || routerV2Data.data || []);
          
          for (const pool of pools) {
            const token0 = pool.token0_address || pool.token0 || pool.token0Address;
            const token1 = pool.token1_address || pool.token1 || pool.token1Address;
            
            const matches = 
              (token0 && (token0 === address || token0 === normalizedEQ || token0 === normalizedUQ)) ||
              (token1 && (token1 === address || token1 === normalizedEQ || token1 === normalizedUQ));
            
            if (matches && pool.reserve0 && pool.reserve1) {
              const reserve0 = BigInt(pool.reserve0 || '0');
              const reserve1 = BigInt(pool.reserve1 || '0');
              
              if (reserve0 > 0n && reserve1 > 0n) {
                console.log(`Found pool for ${address} via v2:`, pool.address || pool.pool_address);
                return {
                  address: pool.address || pool.pool_address || pool.poolAddress || '',
                  token0: token0,
                  token1: token1,
                  reserve0: pool.reserve0,
                  reserve1: pool.reserve1,
                  lp_total_supply: pool.lp_total_supply || pool.lpTotalSupply || '0',
                };
              }
            }
          }
        }
      } catch (e) {
        console.log(`Router V2 API failed for ${address}:`, e);
      }
    }
    
    console.log(`No liquidity found via STON.fi for token: ${tokenAddress}`);
    
    // Try DYOR.io as fallback
    console.log(`Trying DYOR.io for ${tokenAddress}...`);
    const dyorResult = await checkDyorLiquidity(tokenAddress);
    if (dyorResult && dyorResult.liquidity > 0) {
      console.log(`DYOR.io found liquidity for ${tokenAddress}: $${dyorResult.liquidity}`);
      // Return a pool object indicating liquidity exists
      return {
        address: dyorResult.poolAddress || '',
        token0: normalizedEQ,
        token1: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', // TON address
        reserve0: '0', // DYOR doesn't provide reserves
        reserve1: '0',
        lp_total_supply: '0',
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error checking STON.fi liquidity:', error);
    
    // Try DYOR.io as fallback even on error
    try {
      const dyorResult = await checkDyorLiquidity(tokenAddress);
      if (dyorResult && dyorResult.liquidity > 0) {
        const normalizedEQ = tokenAddress.replace(/^UQ/, 'EQ');
        console.log(`DYOR.io API fallback found liquidity for ${tokenAddress}: $${dyorResult.liquidity}`);
        return {
          address: dyorResult.poolAddress || '',
          token0: normalizedEQ,
          token1: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
          reserve0: '0',
          reserve1: '0',
          lp_total_supply: '0',
        };
      }
    } catch (e) {
      console.error('DYOR.io API fallback also failed:', e);
    }
    
    return null;
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

