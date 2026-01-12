'use client';

import { useState, useEffect } from 'react';
import { useTonConnect } from '@/hooks/useTonConnect';
import { getUserTokens, getTokenDeployedAt } from '@/lib/cookTokens';
import Header from '@/components/Header';
import Link from 'next/link';
import Image from 'next/image';
import { Address } from '@ton/core';

interface JettonInfo {
  address: string;
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  deployedAt?: number;
}

export default function MyJettonsPage() {
  const { connected, wallet } = useTonConnect();
  const [jettons, setJettons] = useState<JettonInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (connected && wallet) {
      loadUserJettons();
    } else {
      setLoading(false);
    }
  }, [connected, wallet]);

  const loadUserJettons = async () => {
    if (!wallet) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const walletAddress = wallet.toString();
      const tokenAddresses = getUserTokens(walletAddress);
      
      // If no tokens, set empty array immediately
      if (tokenAddresses.length === 0) {
        setJettons([]);
        setLoading(false);
        return;
      }
      
      // Load metadata for each token with timeout and error handling
      const jettonsData: JettonInfo[] = [];
      
      // Load tokens sequentially to avoid overwhelming the API
      for (const address of tokenAddresses) {
        const deployedAt = getTokenDeployedAt(address);
        const jettonInfo: JettonInfo = {
          address,
          deployedAt,
        };
        
        try {
          // Try to get metadata from API with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          const response = await fetch(`/api/jetton-metadata/${address}`, {
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const metadata = await response.json();
            jettonInfo.name = metadata.name;
            jettonInfo.symbol = metadata.symbol;
            jettonInfo.description = metadata.description;
            jettonInfo.image = metadata.image;
          }
        } catch (error: any) {
          // Silently fail - token will be shown without metadata
          if (error.name !== 'AbortError') {
            console.error(`Failed to load metadata for ${address}:`, error);
          }
        }
        
        jettonsData.push(jettonInfo);
      }

      // Sort by deployment date (newest first)
      jettonsData.sort((a, b) => (b.deployedAt || 0) - (a.deployedAt || 0));
      
      setJettons(jettonsData);
    } catch (error) {
      console.error('Failed to load user jettons:', error);
      setJettons([]);
    } finally {
      setLoading(false);
    }
  };

  if (!connected || !wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-orange-50">
        <Header />
        <main className="pt-24 pb-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="card text-center">
              <h1 className="text-3xl font-bold text-cook-text mb-4">My Jettons</h1>
              <p className="text-cook-text-secondary mb-6">
                Connect your wallet to view your created tokens
              </p>
              <div className="flex justify-center">
                <Link href="/" className="btn-cook">
                  Go to Home
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50">
      <Header />
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold gradient-text-cook mb-2">My Jettons</h1>
            <p className="text-cook-text-secondary">
              Manage your created Jetton 2.0 tokens
            </p>
          </div>

          {loading ? (
            <div className="card text-center py-12">
              <div className="spinner mx-auto mb-4" />
              <p className="text-cook-text-secondary">Loading your tokens...</p>
            </div>
          ) : jettons.length === 0 ? (
            <div className="card text-center py-12">
              <Image
                src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp"
                alt="No tokens"
                width={80}
                height={80}
                className="mx-auto mb-4 opacity-50"
                unoptimized
              />
              <h2 className="text-2xl font-bold text-cook-text mb-2">No tokens yet</h2>
              <p className="text-cook-text-secondary mb-6">
                Create your first Jetton 2.0 token to see it here
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/" className="btn-cook">
                  Create Token
                </Link>
                <Link href="/cookon" className="btn-secondary">
                  Try Cookon AI
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jettons.map((jetton) => (
                <div key={jetton.address} className="card hover:scale-105 transition-transform">
                  {jetton.image && (
                    <div className="mb-4 -mx-6 -mt-6 rounded-t-2xl overflow-hidden">
                      <Image
                        src={jetton.image}
                        alt={jetton.name || 'Token'}
                        width={400}
                        height={400}
                        className="w-full h-48 object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  
                  <div className="mb-4">
                    {jetton.name && (
                      <h3 className="text-xl font-bold text-cook-text mb-1">
                        {jetton.name}
                      </h3>
                    )}
                    {jetton.symbol && (
                      <p className="text-lg font-semibold text-cook-orange mb-2">
                        ${jetton.symbol}
                      </p>
                    )}
                    {jetton.description && (
                      <p className="text-sm text-cook-text-secondary line-clamp-2 mb-3">
                        {jetton.description}
                      </p>
                    )}
                    <div className="p-3 bg-cook-bg-secondary rounded-lg">
                      <p className="text-xs text-cook-text-secondary mb-1">Contract Address</p>
                      <code className="text-xs text-cook-orange break-all">
                        {jetton.address}
                      </code>
                    </div>
                    {jetton.deployedAt && (
                      <p className="text-xs text-cook-text-secondary mt-2">
                        Created: {new Date(jetton.deployedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/admin?address=${jetton.address}`}
                      className="btn-cook text-center text-sm py-2"
                    >
                      Manage Token
                    </Link>
                    <Link
                      href={`https://tonviewer.com/${jetton.address}`}
                      target="_blank"
                      className="btn-secondary text-center text-sm py-2"
                    >
                      View on Explorer
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
