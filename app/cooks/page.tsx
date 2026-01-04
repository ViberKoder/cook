'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getCookTokens, getTokenDeployedAt } from '@/lib/cookTokens';

// Cooks page - displays tokens created on cook.tg that have liquidity on DYOR.io

interface CookToken {
  address: string;
  name: string;
  symbol: string;
  image?: string;
  description?: string;
  totalSupply: string;
  decimals: number;
  hasLiquidity: boolean;
  totalLiquidity: number; // Calculated liquidity value in USD
  deployedAt?: number; // Timestamp when token was added to localStorage
}

// No hardcoded tokens - only tokens added via "Add on Cooks" button (after payment)

export default function CooksPage() {
  const [tokens, setTokens] = useState<CookToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCookTokens();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCookTokens = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get ONLY tokens from localStorage (added via "Add on Cooks" button after payment)
      // No hardcoded tokens, no automatic addition - only tokens that were explicitly paid for
      const storedTokens = getCookTokens(); // Returns string[]
      const allTokenAddresses = storedTokens; // Only tokens added via "Add on Cooks"
      
      console.log('Loading tokens from Cooks (only paid tokens):', {
        fromStorage: storedTokens.length,
        total: allTokenAddresses.length,
      });
      
      if (allTokenAddresses.length === 0) {
        console.log('No tokens found. Use "Add on Cooks" button to add your token.');
        setTokens([]);
        setLoading(false);
        return;
      }
      
      // Load token metadata from TonAPI for all tokens
      const tokenCheckPromises = allTokenAddresses.map(async (tokenAddress) => {
        try {
          const normalizedEQ = tokenAddress.replace(/^UQ/, 'EQ');
          
          // Get token metadata from TonAPI
          const tokenResponse = await fetch(`https://tonapi.io/v2/jettons/${normalizedEQ}`, {
            signal: AbortSignal.timeout(5000),
          });
          
          if (!tokenResponse.ok) {
            console.warn(`Could not fetch metadata for ${tokenAddress}`);
            return null;
          }
          
          const tokenData = await tokenResponse.json();
          const deployedAt = getTokenDeployedAt(tokenAddress);
          
          const token: CookToken = {
            address: tokenAddress,
            name: tokenData.metadata?.name || 'Unknown',
            symbol: tokenData.metadata?.symbol || '???',
            image: tokenData.metadata?.image,
            description: tokenData.metadata?.description,
            totalSupply: tokenData.total_supply || '0',
            decimals: parseInt(tokenData.metadata?.decimals || '9'),
            hasLiquidity: false, // No liquidity check needed
            totalLiquidity: 0, // No liquidity check needed
            deployedAt,
          };
          
          return token;
        } catch (err) {
          console.error(`Error loading token ${tokenAddress}:`, err);
          return null;
        }
      });
      
      const tokenResults = await Promise.all(tokenCheckPromises);
      const validTokens = tokenResults.filter((t): t is CookToken => t !== null && t !== undefined);
      
      console.log(`Loaded ${validTokens.length} tokens from Cooks`);
      
      setTokens(validTokens);
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

      // Sort tokens by newest first
      const sortedTokens = useMemo(() => {
        return [...tokens].sort((a, b) => {
          const aTime = a.deployedAt || 0;
          const bTime = b.deployedAt || 0;
          return bTime - aTime; // Newest first
        });
      }, [tokens]);

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
          <div className="flex justify-center mb-4">
            <Image 
              src="https://em-content.zobj.net/source/telegram/386/cooking_1f373.webp" 
              alt="Cooking" 
              width={120}
              height={120}
              className="drop-shadow-lg"
              unoptimized
            />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-cook-text mb-2 text-center">
            <span className="gradient-text-cook">Cooks</span>
          </h1>
          <p className="text-cook-text-secondary text-center mb-8">
            Jetton created by Cook, who decided to show themselves
          </p>

          {loading && (
            <div className="card text-center py-12">
              <div className="spinner mx-auto mb-4" />
              <p className="text-cook-text-secondary">Loading cooks</p>
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
              {/* Add Token Button */}
              <div className="flex justify-center mb-8">
                <Link
                  href="/cooks/add"
                  className="btn-cook flex items-center justify-center gap-2 text-lg px-8 py-4"
                >
                  <Image 
                    src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
                    alt="" 
                    width={24}
                    height={24}
                    unoptimized
                  />
                  Add Your Token to Cooks
                </Link>
              </div>

                  {sortedTokens.length === 0 ? (
                <div className="card text-center py-12">
                  <Image 
                    src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
                    alt="Cook" 
                    width={80}
                    height={80}
                    className="mx-auto mb-4 opacity-50"
                    unoptimized
                  />
                  <p className="text-cook-text-secondary mb-4">No tokens found yet.</p>
                  <p className="text-sm text-cook-text-secondary mb-4">
                    Use the &quot;Add on Cooks&quot; button after deploying your token to add it here.
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
                      {sortedTokens.map((token) => (
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
