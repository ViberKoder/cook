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
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTrade, setShowTrade] = useState(false);

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
      // Load token info, holders, and pool info in parallel
      const [tokenResponse, holdersResponse, pool] = await Promise.all([
        fetch(`https://tonapi.io/v2/jettons/${tokenAddress}`),
        fetch(`https://tonapi.io/v2/jettons/${tokenAddress}/holders?limit=20`),
        checkStonfiLiquidity(tokenAddress),
      ]);

      if (!tokenResponse.ok) {
        throw new Error('Token not found');
      }

      const tokenData = await tokenResponse.json();
      
      setTokenInfo({
        address: tokenAddress,
        name: tokenData.metadata?.name || 'Unknown',
        symbol: tokenData.metadata?.symbol || '???',
        image: tokenData.metadata?.image,
        description: tokenData.metadata?.description,
        totalSupply: tokenData.total_supply || '0',
        decimals: parseInt(tokenData.metadata?.decimals || '9'),
        adminAddress: tokenData.admin?.address,
        mintable: tokenData.mintable !== false,
      });

      // Load holders
      if (holdersResponse.ok) {
        const holdersData = await holdersResponse.json();
        const totalSupply = BigInt(tokenData.total_supply || '0');
        
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

      // Set pool info
      if (pool) {
        setPoolInfo(pool);
      }
    } catch (err: any) {
      console.error('Failed to load token data:', err);
      setError(err.message || 'Failed to load token data');
    } finally {
      setLoading(false);
    }
  };

  const formatSupply = (supply: string, decimals: number) => {
    try {
      const num = BigInt(supply);
      const divisor = BigInt(10 ** decimals);
      const whole = num / divisor;
      const remainder = num % divisor;
      
      if (remainder === 0n) {
        return whole.toLocaleString();
      }
      
      const decimalsStr = remainder.toString().padStart(decimals, '0');
      const trimmed = decimalsStr.replace(/0+$/, '');
      return `${whole.toLocaleString()}.${trimmed}`;
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
            <div className="flex items-center gap-6 mb-6">
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
              <div className="flex-grow">
                <h1 className="text-3xl font-bold text-cook-text mb-2">{tokenInfo.name}</h1>
                <p className="text-xl text-cook-text-secondary mb-4">${tokenInfo.symbol}</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-sm font-medium">
                    Has Liquidity
                  </span>
                  {tokenInfo.adminAddress ? (
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                      Has Admin
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm font-medium">
                      Decentralized
                    </span>
                  )}
                </div>
              </div>
            </div>

            {tokenInfo.description && (
              <p className="text-cook-text-secondary mb-6">{tokenInfo.description}</p>
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
                <p className="text-lg font-bold text-cook-text">{holders.length}</p>
              </div>
              <div>
                <p className="text-sm text-cook-text-secondary mb-1">Mintable</p>
                <p className="text-lg font-bold text-cook-text">{tokenInfo.mintable ? 'Yes' : 'No'}</p>
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

          {/* Liquidity Pool Info */}
          {poolInfo && (
            <div className="card mb-6">
              <h2 className="text-xl font-bold text-cook-text mb-4">Liquidity Pool</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-cook-text-secondary mb-1">Token 0 Reserve</p>
                  <p className="text-lg font-bold text-cook-text">{formatSupply(poolInfo.reserve0, tokenInfo.decimals)}</p>
                </div>
                <div>
                  <p className="text-sm text-cook-text-secondary mb-1">Token 1 Reserve</p>
                  <p className="text-lg font-bold text-cook-text">{formatSupply(poolInfo.reserve1, 9)} TON</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-cook-border">
                <Link
                  href={stonfiPoolUrl}
                  target="_blank"
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Pool on STON.fi
                </Link>
              </div>
            </div>
          )}

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

