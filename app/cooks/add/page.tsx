'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTonConnect } from '@/hooks/useTonConnect';
import { sendAddToCooksTransaction } from '@/lib/admin';
import { addCookToken, setTokenDeployedAt } from '@/lib/cookTokens';
import toast from 'react-hot-toast';

export default function AddToCooksPage() {
  const { connected, wallet, sendTransaction } = useTonConnect();
  const [tokenAddress, setTokenAddress] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAddToCooks = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }
    if (!tokenAddress.trim()) {
      toast.error('Please enter a token address');
      return;
    }

    // Validate address format
    const normalizedAddress = tokenAddress.trim().replace(/^UQ/, 'EQ');
    if (!normalizedAddress.startsWith('EQ') || normalizedAddress.length < 48) {
      toast.error('Invalid token address format');
      return;
    }

    setAdding(true);
    try {
      await sendAddToCooksTransaction(sendTransaction);
      addCookToken(normalizedAddress);
      setTokenDeployedAt(normalizedAddress);
      toast.success('Token added to Cooks! Payment of 0.2 TON processed.');
      setTokenAddress('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add token to Cooks');
    } finally {
      setAdding(false);
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
        <div className="max-w-2xl mx-auto">
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

          <h1 className="text-3xl md:text-4xl font-bold text-cook-text mb-2 text-center">
            Add Token to <span className="gradient-text-cook">Cooks</span>
          </h1>
          <p className="text-cook-text-secondary text-center mb-8">
            Pay 0.2 TON to add your token to the Cooks section
          </p>

          <div className="card">
            {!connected ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto mb-4 text-cook-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-xl font-semibold text-cook-text mb-2">Connect Wallet</h3>
                <p className="text-cook-text-secondary mb-6">Connect your wallet to add a token to Cooks</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-cook-text mb-2">
                    Token Address
                  </label>
                  <input
                    type="text"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    placeholder="EQ... or UQ..."
                    className="input-ton w-full"
                  />
                  <p className="text-xs text-cook-text-secondary mt-2">
                    Enter the address of the token you want to add to Cooks
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 dark:border-orange-700 rounded-xl mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Image 
                      src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
                      alt="Cook" 
                      width={20}
                      height={20}
                      unoptimized
                    />
                    <h3 className="font-bold text-cook-text text-sm">Payment Required</h3>
                  </div>
                  <p className="text-xs text-cook-text-secondary">
                    Adding a token to Cooks requires a payment of 0.2 TON. Your token will appear immediately after payment.
                  </p>
                </div>

                <button
                  onClick={handleAddToCooks}
                  disabled={!connected || adding || !tokenAddress.trim()}
                  className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-yellow-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                >
                  {adding ? (
                    <>
                      <div className="spinner" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Image 
                        src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
                        alt="" 
                        width={24}
                        height={24}
                        unoptimized
                      />
                      Add to Cooks (0.2 TON)
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          <div className="card mt-6">
            <h3 className="text-lg font-bold text-cook-text mb-4">How it works</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-cook-orange text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="text-cook-text font-medium">Enter Token Address</p>
                  <p className="text-sm text-cook-text-secondary">Paste the address of your Jetton 2.0 token</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-cook-orange text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="text-cook-text font-medium">Pay 0.2 TON</p>
                  <p className="text-sm text-cook-text-secondary">Confirm the transaction in your wallet</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-cook-orange text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="text-cook-text font-medium">Token Added</p>
                  <p className="text-sm text-cook-text-secondary">Your token will appear in the Cooks section immediately</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

