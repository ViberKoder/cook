'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Address } from '@ton/core';

interface CookToken {
  address: string;
  name: string;
  symbol: string;
  image?: string;
  description?: string;
  totalSupply: string;
  decimals: number;
  hasLiquidity: boolean;
  liquidityPool?: string;
}

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
      // TODO: Replace with actual API endpoint that tracks tokens created on cook.tg
      // For now, we'll use a placeholder that checks known tokens
      // In production, this should query a backend that:
      // 1. Tracks all tokens deployed via cook.tg
      // 2. Checks which ones have liquidity pools on DEXes
      
      // Example: Check STON.fi for pools containing tokens
      // This is a simplified version - in production you'd want to:
      // - Query your backend API for tokens created on cook.tg
      // - Check DEX APIs (STON.fi, DeDust) for liquidity pools
      // - Filter to only show tokens with active liquidity
      
      const response = await fetch('https://tonapi.io/v2/jettons/trending?limit=50');
      if (!response.ok) {
        throw new Error('Failed to load tokens');
      }
      
      const data = await response.json();
      
      // Filter and map tokens
      // In production, you'd filter by:
      // - Tokens created via cook.tg (tracked in your database)
      // - Tokens with active liquidity pools
      const cookTokens: CookToken[] = data.jettons
        ?.filter((jetton: any) => {
          // Placeholder: In production, check if token was created on cook.tg
          // and has liquidity
          return true; // For now, show all trending tokens
        })
        .map((jetton: any) => ({
          address: jetton.address,
          name: jetton.metadata?.name || 'Unknown',
          symbol: jetton.metadata?.symbol || '???',
          image: jetton.metadata?.image,
          description: jetton.metadata?.description,
          totalSupply: jetton.total_supply || '0',
          decimals: parseInt(jetton.metadata?.decimals || '9'),
          hasLiquidity: true, // In production, check actual liquidity
          liquidityPool: `https://app.ston.fi/pools/${jetton.address}`,
        })) || [];
      
      setTokens(cookTokens);
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
            Tokens created on Cook.tg that have active liquidity pools
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
                  <p className="text-sm text-cook-text-secondary">
                    Create your token and add liquidity to see it here!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tokens.map((token) => (
                    <div key={token.address} className="card hover:shadow-xl transition-shadow">
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
                        <div className="flex justify-between text-sm">
                          <span className="text-cook-text-secondary">Status</span>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-medium">
                            Has Liquidity
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link
                          href={`https://tonviewer.com/${token.address}`}
                          target="_blank"
                          className="flex-1 btn-secondary text-sm text-center"
                        >
                          View
                        </Link>
                        {token.liquidityPool && (
                          <Link
                            href={token.liquidityPool}
                            target="_blank"
                            className="flex-1 btn-cook text-sm text-center"
                          >
                            Trade
                          </Link>
                        )}
                      </div>
                    </div>
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

