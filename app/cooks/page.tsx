'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getCookTokens, getTokenDeployedAt } from '@/lib/cookTokens';
import { checkStonfiLiquidity, StonfiPool } from '@/lib/stonfi';

// Cooks page - displays tokens created on cook.tg with liquidity

interface CookToken {
  address: string;
  name: string;
  symbol: string;
  image?: string;
  description?: string;
  totalSupply: string;
  decimals: number;
  hasLiquidity: boolean;
  poolInfo?: StonfiPool; // Full pool info if available (from STON.fi or DYOR.io)
  totalLiquidity: number; // Calculated liquidity value in USD
  deployedAt?: number; // Timestamp when token was added to localStorage
}

// Hardcoded known tokens (for tokens deployed before localStorage implementation)
const HARDCODED_TOKENS: string[] = [
  'EQBkRlirdJlIcPOhuXnOwQjOkAZcIOgHBfFvDf2mUWiqVk-Q', // dontbuyit token
  'EQCnVx4qmrEg8RB6WyujsKsmFZza6RUrEpTfLzdhuM3eCOci', // donttbuyyitt token
  'EQAqnsnR53WLm7CpUH5nJ0mRg671E_aWI_I4Ythke_NnYyMX', // 12 token
  'EQATYt5Gvv6SYFICozdqHWY9hm7v4OeL75Rn_RJjb4jM0rN-', // test5 token
];

type SortOption = 'newest' | 'volume' | 'liquidity';

export default function CooksPage() {
  const [tokens, setTokens] = useState<CookToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyWithLiquidity, setShowOnlyWithLiquidity] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  useEffect(() => {
    loadCookTokens();
  }, []);

  const loadCookTokens = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get ALL tokens deployed on cook.tg from localStorage
      // These are tokens that were created via cook.tg, regardless of liquidity status
      const storedTokens = getCookTokens(); // Returns string[]
      const allTokenAddresses = [...new Set([...HARDCODED_TOKENS, ...storedTokens])];
      
      console.log('Loading tokens deployed on cook.tg:', {
        hardcoded: HARDCODED_TOKENS.length,
        fromStorage: storedTokens.length,
        total: allTokenAddresses.length,
        addresses: allTokenAddresses.slice(0, 10) // Log first 10 to avoid spam
      });
      
      if (allTokenAddresses.length === 0) {
        console.log('No tokens found in localStorage. Tokens will appear here after deployment on cook.tg.');
        setTokens([]);
        setLoading(false);
        return;
      }
      
      // First, load all token metadata quickly (parallel)
      const tokenMetadataPromises = allTokenAddresses.map(async (tokenAddress) => {
        try {
          const tokenResponse = await fetch(`https://tonapi.io/v2/jettons/${tokenAddress}`);
          if (!tokenResponse.ok) return null;
          const tokenData = await tokenResponse.json();
          return {
            address: tokenAddress,
            data: tokenData,
          };
        } catch (err) {
          console.error(`Error loading token ${tokenAddress}:`, err);
          return null;
        }
      });
      
      const tokenMetadataResults = await Promise.all(tokenMetadataPromises);
      const validMetadata = tokenMetadataResults.filter((r): r is { address: string; data: any } => r !== null);
      
      // Then check liquidity for all tokens in parallel (with timeout)
      const liquidityCheckPromises = validMetadata.map(async (item) => {
        try {
          console.log(`Starting liquidity check for token: ${item.address}`);
          // Set timeout for liquidity check (8 seconds max per token - increased for DYOR.io)
          const pool = await Promise.race([
            checkStonfiLiquidity(item.address),
            new Promise<StonfiPool | null>((resolve) => setTimeout(() => resolve(null), 8000)),
          ]);
          const hasLiquidity = pool !== null;
          console.log(`Liquidity check result for ${item.address}: hasLiquidity=${hasLiquidity}`);
          
          // Calculate total liquidity value
          let totalLiquidity = 0;
          if (pool) {
            try {
              // First, check if pool has totalLiquidityUsd from DYOR.io
              if (pool.totalLiquidityUsd && pool.totalLiquidityUsd > 0) {
                totalLiquidity = pool.totalLiquidityUsd;
                console.log(`Using totalLiquidityUsd from pool for ${item.address}: $${totalLiquidity}`);
              } else if (pool.reserve0 && pool.reserve1 && pool.reserve0 !== '0' && pool.reserve1 !== '0') {
                // If pool has reserves, calculate from them
                const reserve0TON = Number(pool.reserve0) / 1e9; // TON reserve
                const reserve1Token = Number(pool.reserve1) / (10 ** parseInt(item.data.metadata?.decimals || '9'));
                // Simple calculation: TON value * 2 (approximate)
                totalLiquidity = reserve0TON * 2;
                console.log(`Calculated liquidity from reserves for ${item.address}: $${totalLiquidity}`);
              } else {
                // If no reserves but pool exists, try to get liquidity from DYOR.io liquidity API
                // This happens when DYOR.io found liquidity but STON.fi didn't provide reserves
                try {
                  const normalizedEQ = item.address.replace(/^UQ/, 'EQ');
                  const dyorResponse = await fetch(`https://api.dyor.io/v1/jettons/${normalizedEQ}/liquidity?currency=usd`, {
                    signal: AbortSignal.timeout(3000),
                  });
                  if (dyorResponse.ok) {
                    const dyorData = await dyorResponse.json();
                    if (dyorData.usd) {
                      const liquidityValue = dyorData.usd.value;
                      const liquidityDecimals = dyorData.usd.decimals || 9;
                      totalLiquidity = typeof liquidityValue === 'string'
                        ? parseFloat(liquidityValue) / (10 ** liquidityDecimals)
                        : parseFloat(liquidityValue) / (10 ** liquidityDecimals);
                      console.log(`Extracted liquidity from DYOR.io liquidity API for ${item.address}: $${totalLiquidity}`);
                    } else if (dyorData.value) {
                      // Fallback to value field
                      const liquidityValue = dyorData.value.value;
                      const liquidityDecimals = dyorData.value.decimals || 9;
                      totalLiquidity = typeof liquidityValue === 'string'
                        ? parseFloat(liquidityValue) / (10 ** liquidityDecimals)
                        : parseFloat(liquidityValue) / (10 ** liquidityDecimals);
                      console.log(`Extracted liquidity from DYOR.io (value field) for ${item.address}: $${totalLiquidity}`);
                    }
                  }
                } catch (e) {
                  console.log(`DYOR.io liquidity API fetch failed for ${item.address}:`, e);
                  // If DYOR fetch fails but pool exists, set minimal value
                  totalLiquidity = 0.01;
                }
              }
            } catch (e) {
              console.error('Error calculating liquidity:', e);
            }
          }
          
          console.log(`Token ${item.address}: liquidity check = ${hasLiquidity}, liquidity = ${totalLiquidity}`);
          return {
            address: item.address,
            hasLiquidity,
            pool,
            totalLiquidity,
          };
        } catch (e) {
          console.error(`Liquidity check error for ${item.address}:`, e);
          return {
            address: item.address,
            hasLiquidity: false,
            pool: null,
            totalLiquidity: 0,
          };
        }
      });
      
      const liquidityResults = await Promise.all(liquidityCheckPromises);
      console.log('Liquidity check results:', liquidityResults);
      
      // Build final token list
      // All tokens here were deployed on cook.tg (from localStorage)
      // We check their liquidity status via API - if they have liquidity, they appear on /cooks
      const allTokens: CookToken[] = validMetadata
        .map(item => {
          const liquidityData = liquidityResults.find(r => r.address === item.address);
          const deployedAt = getTokenDeployedAt(item.address);
          
          const token: CookToken = {
            address: item.address,
            name: item.data.metadata?.name || 'Unknown',
            symbol: item.data.metadata?.symbol || '???',
            image: item.data.metadata?.image,
            description: item.data.metadata?.description,
            totalSupply: item.data.total_supply || '0',
            decimals: parseInt(item.data.metadata?.decimals || '9'),
            hasLiquidity: liquidityData?.hasLiquidity || false,
            poolInfo: liquidityData?.pool || undefined,
            totalLiquidity: liquidityData?.totalLiquidity || 0,
            deployedAt,
          };
          
          // Log token status
          if (token.hasLiquidity) {
            console.log(`✅ Token ${token.symbol} (${item.address}) deployed on cook.tg and has liquidity: $${token.totalLiquidity}`);
          } else {
            console.log(`⏳ Token ${token.symbol} (${item.address}) deployed on cook.tg but no liquidity yet`);
          }
          
          return token;
        });
      
      const tokensWithLiquidity = allTokens.filter(t => t.hasLiquidity).length;
      console.log(`Summary: ${allTokens.length} tokens deployed on cook.tg, ${tokensWithLiquidity} have liquidity (will appear on /cooks)`);
      
      setTokens(allTokens);
    } catch (err: any) {
      console.error('Failed to load Cook tokens:', err);
      setError(err.message || 'Failed to load tokens');
    } finally {
      setLoading(false);
    }
  };

  const formatSupply = (supply: string, decimals: number) => {
    try {
      const num = BigInt(supply);
      const divisor = BigInt(10 ** decimals);
      const whole = num / divisor;
      return whole.toLocaleString();
    } catch {
      return supply;
    }
  };

  const formatLiquidity = (liquidity: number) => {
    if (liquidity >= 1000000) {
      return `${(liquidity / 1000000).toFixed(2)}M TON`;
    } else if (liquidity >= 1000) {
      return `${(liquidity / 1000).toFixed(2)}K TON`;
    } else {
      return `${liquidity.toFixed(2)} TON`;
    }
  };

  // Filter and sort tokens
  const filteredAndSortedTokens = tokens
    .filter(token => {
      if (showOnlyWithLiquidity) {
        return token.hasLiquidity;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          const aTime = a.deployedAt || 0;
          const bTime = b.deployedAt || 0;
          return bTime - aTime; // Newest first
        case 'liquidity':
          const aLiq = a.poolInfo?.totalLiquidity || 0;
          const bLiq = b.poolInfo?.totalLiquidity || 0;
          return bLiq - aLiq; // Highest liquidity first
        case 'volume':
          // For now, use liquidity as volume proxy
          const aVol = a.poolInfo?.totalLiquidity || 0;
          const bVol = b.poolInfo?.totalLiquidity || 0;
          return bVol - aVol; // Highest volume first
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-orange-500/30 to-yellow-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-400/25 to-amber-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-[550px] h-[550px] bg-gradient-to-br from-yellow-500/20 to-orange-400/25 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="flex-grow relative z-10 pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-cook-text mb-2 text-center">
            <span className="gradient-text-cook">Cooks</span>
          </h1>
          <p className="text-cook-text-secondary text-center mb-8">
            Tokens created on Cook.tg
          </p>

          {/* Filters */}
          <div className="card mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyWithLiquidity}
                  onChange={(e) => setShowOnlyWithLiquidity(e.target.checked)}
                  className="w-5 h-5 accent-cook-orange"
                />
                <span className="text-cook-text font-medium">Show only tokens with liquidity</span>
              </label>
              
              <div className="flex items-center gap-2">
                <span className="text-cook-text-secondary text-sm">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-2 bg-cook-bg-secondary border border-cook-border rounded-xl text-cook-text focus:outline-none focus:ring-2 focus:ring-cook-orange"
                >
                  <option value="newest">Newest First</option>
                  <option value="liquidity">Highest Liquidity</option>
                  <option value="volume">Highest Volume</option>
                </select>
              </div>
            </div>
          </div>

          {loading && (
            <div className="card text-center py-12">
              <div className="spinner mx-auto mb-4" />
              <p className="text-cook-text-secondary">Loading tokens...</p>
            </div>
          )}

          {error && (
            <div className="card text-center py-12">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button onClick={loadCookTokens} className="btn-cook">
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {filteredAndSortedTokens.length === 0 ? (
                <div className="card text-center py-12">
                  <Image 
                    src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
                    alt="Cook" 
                    width={80}
                    height={80}
                    className="mx-auto mb-4 opacity-50"
                    unoptimized
                  />
                  <p className="text-cook-text-secondary mb-4">
                    {showOnlyWithLiquidity 
                      ? 'No tokens with liquidity found yet.' 
                      : 'No tokens found yet.'}
                  </p>
                  <p className="text-sm text-cook-text-secondary mb-4">
                    {showOnlyWithLiquidity
                      ? 'Create your token and add liquidity on STON.fi to see it here!'
                      : 'Create your token to see it here!'}
                  </p>
                  <Link href="/" className="btn-cook inline-flex items-center gap-2">
                    <Image 
                      src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
                      alt="" 
                      width={20}
                      height={20}
                      unoptimized
                    />
                    Create Token
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedTokens.map((token) => (
                    <Link
                      key={token.address}
                      href={`/cooks/${token.address}`}
                      className="card hover:shadow-xl transition-all hover:scale-105"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-xl bg-cook-bg-secondary overflow-hidden flex-shrink-0 border border-cook-border">
                          {token.image ? (
                            <Image 
                              src={token.image} 
                              alt={token.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                              unoptimized
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-cook-text-secondary">
                              {token.symbol?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        <div className="flex-grow min-w-0">
                          <h3 className="text-lg font-bold text-cook-text truncate">{token.name}</h3>
                          <p className="text-cook-text-secondary">${token.symbol}</p>
                        </div>
                      </div>

                      {token.description && (
                        <p className="text-sm text-cook-text-secondary mb-4 line-clamp-2">
                          {token.description}
                        </p>
                      )}

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-cook-text-secondary">Supply</span>
                          <span className="text-cook-text font-medium">
                            {formatSupply(token.totalSupply, token.decimals)} {token.symbol}
                          </span>
                        </div>
                        {token.hasLiquidity && token.poolInfo && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-cook-text-secondary">Liquidity</span>
                              <span className="text-cook-text font-semibold text-green-600 dark:text-green-400">
                                {formatLiquidity(token.poolInfo.totalLiquidity)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-cook-text-secondary">Status</span>
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                                Has Liquidity
                              </span>
                            </div>
                          </>
                        )}
                        {!token.hasLiquidity && (
                          <div className="flex justify-between text-sm">
                            <span className="text-cook-text-secondary">Status</span>
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                              No Liquidity
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-center text-sm text-cook-orange font-medium">
                        View Details →
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
