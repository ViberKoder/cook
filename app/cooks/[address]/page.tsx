'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Address } from '@ton/core';
import { checkStonfiLiquidity, getStonfiPoolUrl, getStonfiTradeUrl } from '@/lib/stonfi';

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  image?: string;
  description?: string;
  totalSupply: string;
  decimals: number;
  adminAddress?: string;
  mintable: boolean;
}

interface Holder {
  address: string;
  balance: string;
  percentage: number;
}

interface PoolInfo {
  address: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  lp_total_supply: string;
}

export default function TokenPage() {
  const params = useParams();
  const tokenAddress = params.address as string;
  
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [holders, setHolders] = useState<Holder[]>([]);
  const [totalHolders, setTotalHolders] = useState<number>(0);
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTrade, setShowTrade] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [priceData, setPriceData] = useState<{ price: number; change24h: number } | null>(null);
  const [dyorData, setDyorData] = useState<{
    price: number;
    priceUsd: number;
    liquidityUsd: number;
    mcap: number;
    holdersCount: number;
    priceChange24h?: number;
  } | null>(null);
  const [dyorLiquidity, setDyorLiquidity] = useState<number | null>(null);
  const [swapCoffeeData, setSwapCoffeeData] = useState<{
    priceUsd: number;
    priceChange24h: number;
    mcap: number;
    tvlUsd: number;
  } | null>(null);

  useEffect(() => {
    if (tokenAddress) {
      loadTokenData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenAddress]);

  const loadTokenData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First, load basic token info quickly
      const tokenResponse = await fetch(`https://tonapi.io/v2/jettons/${tokenAddress}`);

      if (!tokenResponse.ok) {
        throw new Error('Token not found');
      }

      const tokenData = await tokenResponse.json();
      
      const decimals = parseInt(tokenData.metadata?.decimals || '9');
      const tokenInfoData = {
        address: tokenAddress,
        name: tokenData.metadata?.name || 'Unknown',
        symbol: tokenData.metadata?.symbol || '???',
        image: tokenData.metadata?.image,
        description: tokenData.metadata?.description,
        totalSupply: tokenData.total_supply || '0',
        decimals,
        adminAddress: tokenData.admin?.address,
        mintable: tokenData.mintable !== false,
      };
      
      setTokenInfo(tokenInfoData);

      // Mark as loaded so we can show the page
      setLoading(false);

      // Load additional data (holders, pool, and DYOR data) in parallel, but don't block the page
      const totalSupply = BigInt(tokenData.total_supply || '0');
      const normalizedEQ = tokenAddress.replace(/^UQ/, 'EQ');
      
      Promise.all([
        // Load holders
        fetch(`https://tonapi.io/v2/jettons/${tokenAddress}/holders?limit=20`)
          .then(res => res.ok ? res.json() : null)
          .then(holdersData => {
            if (holdersData) {
              // Get total count from API
              setTotalHolders(holdersData.total || holdersData.addresses?.length || 0);
              
              const holdersList: Holder[] = (holdersData.addresses || []).map((holder: any) => {
                const balance = BigInt(holder.balance || '0');
                const percentage = totalSupply > 0n 
                  ? Number((balance * 10000n) / totalSupply) / 100 
                  : 0;
                
                return {
                  address: holder.owner?.address || holder.address,
                  balance: balance.toString(),
                  percentage,
                };
              });
              
              setHolders(holdersList);
            }
          })
          .catch(err => console.error('Failed to load holders:', err)),
        
        // Load data from DexScreener API
        // DexScreener API: https://api.dexscreener.com/latest/dex/tokens/{tokenAddress}
        fetch(`https://api.dexscreener.com/latest/dex/tokens/${normalizedEQ}`)
          .then(res => {
            if (!res.ok) {
              console.log('DexScreener API response not OK:', res.status, res.statusText);
              return null;
            }
            return res.json();
          })
          .then(data => {
            console.log('DexScreener API response:', data);
            
            if (data && data.pairs && Array.isArray(data.pairs) && data.pairs.length > 0) {
              // Find the pair with TON as quote token (usually the main pair)
              const mainPair = data.pairs.find((pair: any) => 
                pair.quoteToken?.symbol === 'TON' || 
                pair.chainId === 'ton' ||
                pair.dexId === 'stonfi' ||
                pair.dexId === 'dedust'
              ) || data.pairs[0]; // Fallback to first pair if no TON pair found
              
              console.log('DexScreener: Using pair:', mainPair.pairAddress, 'for token:', normalizedEQ);
              
              if (mainPair) {
                const priceUsd = parseFloat(mainPair.priceUsd || '0');
                const priceChange24h = parseFloat(mainPair.priceChange?.h24 || '0');
                const liquidityUsd = parseFloat(mainPair.liquidity?.usd || '0');
                
                // Calculate market cap: price * total supply
                let mcap = 0;
                if (priceUsd > 0 && tokenInfo) {
                  const totalSupplyFormatted = Number(tokenInfo.totalSupply) / Math.pow(10, tokenInfo.decimals);
                  mcap = totalSupplyFormatted * priceUsd;
                }
                
                const dexData = {
                  priceUsd,
                  priceChange24h,
                  mcap,
                  tvlUsd: liquidityUsd,
                };
                
                console.log('DexScreener data loaded for', normalizedEQ, ':', dexData);
                setSwapCoffeeData(dexData);
                
                // Use DexScreener data if available
                if (priceUsd > 0) {
                  setPriceData({
                    price: priceUsd,
                    change24h: priceChange24h,
                  });
                }
              }
            } else {
              console.log('DexScreener API returned no pairs for address:', normalizedEQ);
            }
          })
          .catch(err => {
            console.error('Failed to load DexScreener data:', err);
            // Don't fail the whole page if DexScreener is unavailable
          }),
        
        // Load data from DYOR.io API (fallback)
        // Try getJettonDetails endpoint first, then fallback to getJettons with address parameter
        Promise.race([
          // Try getJettonDetails endpoint (if it exists)
          fetch(`https://api.dyor.io/v1/jettons/${normalizedEQ}?currency=ton`)
            .then(res => res.ok ? res.json() : null)
            .then(data => data ? { jetton: data } : null)
            .catch(() => null),
          // Fallback to getJettons with address as query parameter
          fetch(`https://api.dyor.io/v1/jettons?address=${encodeURIComponent(normalizedEQ)}&currency=ton`)
            .then(res => {
              if (!res.ok) {
                console.log('DYOR.io getJettons API response not OK:', res.status, res.statusText);
                return null;
              }
              return res.json();
            })
            .then(data => {
              if (data && data.jettons && data.jettons.length > 0) {
                return { jetton: data.jettons[0] };
              }
              return null;
            })
            .catch(() => null),
        ])
          .then(dyorResponse => {
            if (dyorResponse && dyorResponse.jetton) {
              const jetton = dyorResponse.jetton;
              console.log('DYOR.io jetton data:', jetton);
              
              // Parse price
              const priceValue = jetton.price?.value || '0';
              const priceDecimals = jetton.price?.decimals || 9;
              const price = parseFloat(priceValue) / Math.pow(10, priceDecimals);
              
              // Parse price USD
              const priceUsdValue = jetton.priceUsd?.value || '0';
              const priceUsdDecimals = jetton.priceUsd?.decimals || 9;
              const priceUsd = parseFloat(priceUsdValue) / Math.pow(10, priceUsdDecimals);
              
              // Parse liquidity USD
              const liquidityValue = jetton.liquidityUsd?.value || '0';
              const liquidityDecimals = jetton.liquidityUsd?.decimals || 9;
              const liquidityUsd = parseFloat(liquidityValue) / Math.pow(10, liquidityDecimals);
              
              // Parse market cap
              const mcapValue = jetton.mcap?.value || '0';
              const mcapDecimals = jetton.mcap?.decimals || 9;
              const mcap = parseFloat(mcapValue) / Math.pow(10, mcapDecimals);
              
              // Get holders count
              const holdersCount = parseInt(jetton.holdersCount || '0');
              
              // Get price change (try 24h change) - may not be in response, will be 0 for now
              const priceChange24h = 0;
              
              console.log('Parsed DYOR.io data:', { 
                price, 
                priceUsd, 
                liquidityUsd, 
                mcap, 
                holdersCount
              });
              
              // Only set data if we have meaningful values
              if (price > 0 || mcap > 0 || liquidityUsd > 0) {
                setDyorData({
                  price,
                  priceUsd,
                  liquidityUsd,
                  mcap,
                  holdersCount,
                  priceChange24h,
                });
                
                // Also set priceData for compatibility
                setPriceData({ 
                  price: price || 0, 
                  change24h: priceChange24h 
                });
                
                // Update totalHolders if DYOR has better data
                if (holdersCount > 0) {
                  setTotalHolders(holdersCount);
                }
              } else {
                console.log('DYOR.io data has no meaningful values, skipping');
              }
            } else {
              console.log('DYOR.io API returned no data for address:', normalizedEQ);
            }
          })
          .catch(err => {
            console.error('Failed to load DYOR.io data:', err);
            // Don't fail the whole page if DYOR.io is unavailable
          }),
        
        // Check liquidity and calculate price (don't wait for it, it can be slow)
        // This also checks DYOR.io liquidity API as fallback
        checkStonfiLiquidity(tokenAddress)
          .then(pool => {
            if (pool) {
              setPoolInfo(pool);
              
              // If pool has reserves, calculate price
              if (pool.reserve0 && pool.reserve1 && pool.reserve0 !== '0' && pool.reserve1 !== '0') {
                const reserve0 = BigInt(pool.reserve0 || '0');
                const reserve1 = BigInt(pool.reserve1 || '0');
                
                if (reserve0 > 0n && reserve1 > 0n) {
                  const price = Number(reserve1) * Math.pow(10, decimals) / (Number(reserve0) * Math.pow(10, 9));
                  console.log('Calculated price from pool:', price);
                  
                  // Only set price if DYOR didn't provide it
                  if (!dyorData || !dyorData.price) {
                    setPriceData({ price, change24h: 0 });
                  }
                }
              } else {
                // Pool found but reserves are '0' - this means it was found via DYOR.io liquidity API
                // We need to get liquidity from DYOR.io liquidity endpoint
                console.log('Pool found via DYOR.io liquidity API, fetching liquidity value...');
                fetch(`https://api.dyor.io/v1/jettons/${normalizedEQ}/liquidity?currency=usd`)
                  .then(res => res.ok ? res.json() : null)
                  .then(liquidityData => {
                    if (liquidityData && liquidityData.usd) {
                      const liquidityValue = liquidityData.usd.value || '0';
                      const liquidityDecimals = liquidityData.usd.decimals || 9;
                      const liquidityUsd = parseFloat(liquidityValue) / Math.pow(10, liquidityDecimals);
                      console.log('DYOR.io liquidity fetched:', liquidityUsd);
                      setDyorLiquidity(liquidityUsd);
                    }
                  })
                  .catch(err => console.error('Failed to fetch DYOR.io liquidity:', err));
              }
            }
          })
          .catch(err => {
            console.error('Failed to check liquidity:', err);
            // Don't fail the whole page if liquidity check fails
          }),
      ]);
    } catch (err: any) {
      console.error('Failed to load token data:', err);
      setError(err.message || 'Failed to load token data');
      setLoading(false);
    }
  };

  const formatSupply = (supply: string, decimals: number) => {
    try {
      const num = BigInt(supply);
      const divisor = BigInt(10 ** decimals);
      const whole = num / divisor;
      
      // Return only whole part, no decimals to prevent text overlap
      return whole.toLocaleString();
    } catch {
      return supply;
    }
  };

  const formatBalance = (balance: string, decimals: number) => {
    try {
      const num = BigInt(balance);
      const divisor = BigInt(10 ** decimals);
      const whole = num / divisor;
      return whole.toLocaleString();
    } catch {
      return balance;
    }
  };

  const formatCurrency = (value: number): string => {
    if (value === 0) return '$0';
    if (value < 1000) {
      return `$${value.toFixed(2)}`;
    }
    if (value < 1000000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${(value / 1000000).toFixed(1)}M`;
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow relative z-10 pt-24 pb-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="card text-center py-12">
              <div className="spinner mx-auto mb-4" />
              <p className="text-cook-text-secondary">Loading token data...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !tokenInfo) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow relative z-10 pt-24 pb-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="card text-center py-12">
              <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Token not found'}</p>
              <Link href="/cooks" className="btn-cook">
                Back to Cooks
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const stonfiTradeUrl = getStonfiTradeUrl(tokenAddress);
  const stonfiPoolUrl = getStonfiPoolUrl(tokenAddress);

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
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <Link 
            href="/cooks" 
            className="inline-flex items-center gap-2 text-cook-text-secondary hover:text-cook-orange mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Cooks
          </Link>

          {/* Token Header */}
          <div className="card mb-6">
            {/* Top section: Avatar, Name, Market Data, Trade Button */}
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 mb-6">
              <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto flex-1 min-w-0">
                <div className="w-24 h-24 rounded-2xl bg-cook-bg-secondary overflow-hidden flex-shrink-0 border border-cook-border">
                  {tokenInfo.image ? (
                    <Image 
                      src={tokenInfo.image} 
                      alt={tokenInfo.name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                      unoptimized
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-cook-text-secondary">
                      {tokenInfo.symbol?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-start gap-3 sm:gap-4 flex-wrap">
                    <div className="flex-grow min-w-0">
                      <h1 className="text-3xl font-bold text-cook-text mb-2">{tokenInfo.name}</h1>
                      <p className="text-xl text-cook-text-secondary mb-4">${tokenInfo.symbol}</p>
                      <div className="flex items-center gap-4 flex-wrap">
                        {!tokenInfo.adminAddress && (
                          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm font-medium">
                            Decentralized
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Market Data - Next to name and ticker on mobile, right side on desktop */}
                    {(swapCoffeeData || dyorData || priceData) && (
                      <div className="flex-shrink-0 text-right sm:ml-auto overflow-hidden">
                        {/* Price */}
                        <div className="flex items-center gap-1 sm:gap-1.5 justify-end mb-1 flex-wrap">
                          <span className="text-xs sm:text-xs md:text-sm text-cook-text-secondary">Price: </span>
                          <div className="text-base sm:text-lg md:text-2xl font-bold text-cook-text break-words">
                            {swapCoffeeData?.priceUsd ? (
                              `$${swapCoffeeData.priceUsd.toFixed(4)}`
                            ) : dyorData?.priceUsd ? (
                              `$${dyorData.priceUsd.toFixed(4)}`
                            ) : priceData?.price ? (
                              `$${priceData.price.toFixed(4)}`
                            ) : (
                              'N/A'
                            )}
                          </div>
                          {/* Price Change */}
                          {(swapCoffeeData || dyorData || priceData) && (
                            <span className={`text-xs sm:text-xs md:text-sm font-semibold ${
                              (swapCoffeeData?.priceChange24h ?? dyorData?.priceChange24h ?? priceData?.change24h ?? 0) >= 0 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {(swapCoffeeData?.priceChange24h ?? dyorData?.priceChange24h ?? priceData?.change24h ?? 0) >= 0 ? '+' : ''}
                              {(swapCoffeeData?.priceChange24h ?? dyorData?.priceChange24h ?? priceData?.change24h ?? 0).toFixed(2)}%
                            </span>
                          )}
                        </div>
                        {/* Market Cap and Liquidity */}
                        <div className="flex flex-col items-end gap-0.5 sm:gap-1">
                          <div className="flex items-center gap-1 sm:gap-1.5 justify-end flex-wrap">
                            <span className="text-xs sm:text-xs md:text-sm text-cook-text-secondary">MCap: </span>
                            <span className="text-base sm:text-lg md:text-2xl font-bold text-cook-text break-words">
                              {swapCoffeeData?.mcap ? (
                                formatCurrency(swapCoffeeData.mcap)
                              ) : dyorData?.mcap ? (
                                formatCurrency(dyorData.mcap)
                              ) : priceData && tokenInfo ? (
                                formatCurrency(Number(tokenInfo.totalSupply) / Math.pow(10, tokenInfo.decimals) * priceData.price)
                              ) : (
                                'N/A'
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-1.5 justify-end flex-wrap">
                            <span className="text-xs sm:text-xs md:text-sm text-cook-text-secondary">Liq: </span>
                            <span className="text-base sm:text-lg md:text-2xl font-bold text-cook-text break-words">
                              {swapCoffeeData?.tvlUsd ? (
                                formatCurrency(swapCoffeeData.tvlUsd)
                              ) : dyorData?.liquidityUsd ? (
                                formatCurrency(dyorData.liquidityUsd)
                              ) : dyorLiquidity ? (
                                formatCurrency(dyorLiquidity)
                              ) : poolInfo && poolInfo.reserve1 !== '0' ? (
                                formatCurrency(Number(poolInfo.reserve1) / Math.pow(10, 9) * 2 * 5.5) // Approximate USD conversion
                              ) : (
                                'N/A'
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Trade Button - Right side on desktop, below on mobile */}
              <div className="w-full sm:w-auto sm:ml-auto">
                <Link
                  href={`https://t.me/dtrade?start=cook_${tokenInfo.address}`}
                  target="_blank"
                  className="flex-shrink-0 py-4 sm:py-5 px-8 sm:px-9 text-white font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-3 whitespace-nowrap shadow-lg hover:shadow-xl transform hover:scale-105 w-full sm:w-auto" 
                  style={{
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 25%, #3a3a3a 50%, #2d2d2d 75%, #1a1a1a 100%)',
                  }}
                >
                  <Image
                    src="https://pbs.twimg.com/profile_images/1957769581809807360/Hne_kG84.jpg"
                    alt="DTrade"
                    width={32}
                    height={32}
                    className="rounded-full sm:w-8 sm:h-8"
                    unoptimized
                  />
                  Trade on DTrade
                </Link>
              </div>
            </div>

            {/* Description - Bottom on mobile, same row on desktop */}
            {tokenInfo.description && (
              <div className="mb-6 order-last sm:order-none">
                <p className="text-cook-text-secondary">
                  {tokenInfo.description.length > 75 && !showFullDescription
                    ? `${tokenInfo.description.substring(0, 75)}...`
                    : tokenInfo.description}
                </p>
                {tokenInfo.description.length > 75 && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="mt-2 text-cook-orange hover:underline text-sm font-medium"
                  >
                    {showFullDescription ? 'Скрыть' : 'Раскрыть'}
                  </button>
                )}
              </div>
            )}

            {/* Token Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-cook-border">
              <div>
                <p className="text-sm text-cook-text-secondary mb-1">Total Supply</p>
                <p className="text-lg font-bold text-cook-text">
                  {formatSupply(tokenInfo.totalSupply, tokenInfo.decimals)} {tokenInfo.symbol}
                </p>
              </div>
              <div>
                <p className="text-sm text-cook-text-secondary mb-1">Decimals</p>
                <p className="text-lg font-bold text-cook-text">{tokenInfo.decimals}</p>
              </div>
              <div>
                <p className="text-sm text-cook-text-secondary mb-1">Holders</p>
                <p className="text-lg font-bold text-cook-text">{totalHolders || holders.length}</p>
              </div>
              <div>
                <p className="text-sm text-cook-text-secondary mb-1">Admin Status</p>
                <p className="text-lg font-bold text-cook-text">
                  {!tokenInfo.adminAddress ? (
                    <span className="text-purple-600 dark:text-purple-400">Decentralized</span>
                  ) : tokenInfo.adminAddress === 'EQ0000000000000000000000000000000000000000000000000000000000' || 
                       tokenInfo.adminAddress === 'UQ0000000000000000000000000000000000000000000000000000000000' ? (
                    <span className="text-red-600 dark:text-red-400">Revoked</span>
                  ) : (
                    <span className="text-orange-600 dark:text-orange-400">Has Admin</span>
                  )}
                </p>
              </div>
            </div>

            {/* Contract Address */}
            <div className="mt-6 p-4 bg-cook-bg-secondary rounded-xl">
              <p className="text-sm text-cook-text-secondary mb-2">Contract Address</p>
              <div className="flex items-center gap-2">
                <code className="text-cook-orange font-mono text-sm break-all flex-grow">
                  {tokenInfo.address}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(tokenInfo.address)}
                  className="p-2 hover:bg-cook-border rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-cook-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Trade Section */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-cook-text">Trade on STON.fi</h2>
              <button
                onClick={() => setShowTrade(!showTrade)}
                className="text-cook-orange hover:underline text-sm"
              >
                {showTrade ? 'Hide' : 'Show'} Trading Interface
              </button>
            </div>
            
            {showTrade ? (
              <div className="space-y-3">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-cook-border overflow-hidden">
                  <iframe
                    src={stonfiTradeUrl}
                    className="w-full h-[600px]"
                    title="STON.fi Trading"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                </div>
                <div className="flex gap-2">
                  <Link
                    href={stonfiTradeUrl}
                    target="_blank"
                    className="flex-1 btn-cook text-center"
                  >
                    Open in New Tab
                  </Link>
                  <button
                    onClick={() => setShowTrade(false)}
                    className="btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 rounded-xl border border-blue-400 shadow-lg relative overflow-hidden animate-gradient" style={{
                background: 'linear-gradient(-45deg, #3b82f6, #06b6d4, #2563eb, #0891b2)',
              }}>
                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Image 
                      src="https://ston.fi/images/tild3236-3266-4139-a562-376139323438__ston_logo_light.svg"
                      alt="STON.fi"
                      width={120}
                      height={25}
                      className="brightness-0 invert"
                      unoptimized
                    />
                  </div>
                  <p className="text-white/90 text-center mb-4">
                    Trade {tokenInfo.symbol} directly on STON.fi DEX
                  </p>
                  <button
                    onClick={() => setShowTrade(true)}
                    className="w-full py-3 px-4 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/30 transition-all flex items-center justify-center gap-2 border border-white/30"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Open Trading Interface
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Token Distribution */}
          {holders.length > 0 && (
            <div className="card mb-6">
              <h2 className="text-xl font-bold text-cook-text mb-4">Top Holders</h2>
              <div className="space-y-3">
                {holders.slice(0, 10).map((holder, index) => (
                  <div key={holder.address} className="flex items-center justify-between p-3 bg-cook-bg-secondary rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-cook-orange/20 text-cook-orange flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </span>
                      <div>
                        <Link
                          href={`https://tonviewer.com/${holder.address}`}
                          target="_blank"
                          className="text-cook-text font-medium hover:text-cook-orange transition-colors"
                        >
                          {formatAddress(holder.address)}
                        </Link>
                        <p className="text-xs text-cook-text-secondary">
                          {formatBalance(holder.balance, tokenInfo.decimals)} {tokenInfo.symbol}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-cook-text font-bold">{holder.percentage.toFixed(2)}%</p>
                      <div className="w-24 h-2 bg-cook-border rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-cook-orange rounded-full"
                          style={{ width: `${Math.min(holder.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href={`https://tonviewer.com/${tokenInfo.address}`}
              target="_blank"
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on TonViewer
            </Link>
            <Link
              href={stonfiTradeUrl}
              target="_blank"
              className="btn-cook flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Trade on STON.fi
            </Link>
            {tokenInfo.adminAddress && (
              <Link
                href={`/admin?address=${tokenInfo.address}`}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage Token
              </Link>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

