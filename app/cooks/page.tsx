'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getCookTokens } from '@/lib/cookTokens';
import { checkStonfiLiquidity } from '@/lib/stonfi';

interface CookToken {
  address: string;
  name: string;
  symbol: string;
  image?: string;
  description?: string;
  totalSupply: string;
  decimals: number;
  hasLiquidity: boolean;
}

// Hardcoded known tokens (for tokens deployed before localStorage implementation)
const HARDCODED_TOKENS: string[] = [
  'EQBkRlirdJlIcPOhuXnOwQjOkAZcIOgHBfFvDf2mUWiqVk-Q', // dontbuyit token
  'EQCnVx4qmrEg8RB6WyujsKsmFZza6RUrEpTfLzdhuM3eCOci', // donttbuyyitt token
  'EQAqnsnR53WLm7CpUH5nJ0mRg671E_aWI_I4Ythke_NnYyMX', // 12 token
];

export default function CooksPage() {
  const [tokens, setTokens] = useState<CookToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCookTokens();
  }, []);

  const loadCookTokens = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get tokens from localStorage and combine with hardcoded list
      const storedTokens = getCookTokens();
      const allTokenAddresses = [...new Set([...HARDCODED_TOKENS, ...storedTokens])];
      
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
          // Set timeout for liquidity check (4 seconds max per token)
          const pool = await Promise.race([
            checkStonfiLiquidity(item.address),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
          ]);
          const hasLiquidity = pool !== null;
          console.log(`Token ${item.address}: liquidity check = ${hasLiquidity}`);
          return {
            address: item.address,
            hasLiquidity,
            pool,
          };
        } catch (e) {
          console.error(`Liquidity check error for ${item.address}:`, e);
          return {
            address: item.address,
            hasLiquidity: false,
            pool: null,
          };
        }
      });
      
      const liquidityResults = await Promise.all(liquidityCheckPromises);
      console.log('Liquidity check results:', liquidityResults);
      
      const liquidityMap = new Map(liquidityResults.map(r => [r.address, r.hasLiquidity]));
      
      // For hardcoded tokens, assume they have liquidity if API check fails
      // (they are known to have liquidity)
      const hardcodedSet = new Set(HARDCODED_TOKENS);
      
      // Filter and build final token list (only with liquidity)
      const tokensWithLiquidity: CookToken[] = validMetadata
        .filter(item => {
          const hasLiquidity = liquidityMap.get(item.address) === true;
          const isHardcoded = hardcodedSet.has(item.address);
          
          // Show token if:
          // 1. Liquidity check confirmed it has liquidity, OR
          // 2. It's in hardcoded list (assumed to have liquidity)
          const shouldShow = hasLiquidity || isHardcoded;
          
          if (!shouldShow) {
            console.log(`Filtering out token ${item.address} - no liquidity confirmed`);
          }
          return shouldShow;
        })
        .map(item => ({
          address: item.address,
          name: item.data.metadata?.name || 'Unknown',
          symbol: item.data.metadata?.symbol || '???',
          image: item.data.metadata?.image,
          description: item.data.metadata?.description,
          totalSupply: item.data.total_supply || '0',
          decimals: parseInt(item.data.metadata?.decimals || '9'),
          hasLiquidity: liquidityMap.get(item.address) === true || hardcodedSet.has(item.address),
        }));
      
      console.log(`Found ${tokensWithLiquidity.length} tokens with liquidity out of ${validMetadata.length} total`);
      setTokens(tokensWithLiquidity);
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
            <span className="gradient-text-cook">Cooks</span> with Liquidity
          </h1>
          <p className="text-cook-text-secondary text-center mb-8">
            Tokens created on Cook.tg that have active liquidity pools on STON.fi
          </p>

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
              {tokens.length === 0 ? (
                <div className="card text-center py-12">
                  <Image 
                    src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
                    alt="Cook" 
                    width={80}
                    height={80}
                    className="mx-auto mb-4 opacity-50"
                    unoptimized
                  />
                  <p className="text-cook-text-secondary mb-4">No tokens with liquidity found yet.</p>
                  <p className="text-sm text-cook-text-secondary mb-4">
                    Create your token and add liquidity on STON.fi to see it here!
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
                  {tokens.map((token) => (
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
                        {token.hasLiquidity && (
                          <div className="flex justify-between text-sm">
                            <span className="text-cook-text-secondary">Status</span>
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                              Has Liquidity
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
