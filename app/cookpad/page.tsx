'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTonConnect } from '@/hooks/useTonConnect';
import { Address, beginCell, toNano } from '@ton/core';

// Cookpad - memepad with bonding curve
// Bonding curve ends at 300 TON
// 1% fee goes to UQDjQOdWTP1bPpGpYExAsCcVLGPN_pzGvdno3aCk565ZnQIz
// After 300 TON, token goes to DEX app.ston.fi

const FEE_WALLET = 'UQDjQOdWTP1bPpGpYExAsCcVLGPN_pzGvdno3aCk565ZnQIz';
const MAX_TON_LIQUIDITY = 300; // Bonding curve ends at 300 TON
const FEE_PERCENT = 1; // 1% fee

export default function CookpadPage() {
  const { connected, wallet, sendTransaction } = useTonConnect();
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [totalLiquidity, setTotalLiquidity] = useState(0);
  const [tokenSupply, setTokenSupply] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load cookpad state from contract
    loadCookpadState();
  }, []);

  const loadCookpadState = async () => {
    // TODO: Load from contract
    // For now, placeholder values
    setTotalLiquidity(0);
    setTokenSupply(0);
    setCurrentPrice(0);
  };

  // Bonding curve formula: price = k * supply^2
  // For 300 TON max liquidity, k = 300 / (max_supply^2)
  const calculateBuyPrice = (amount: number) => {
    // Simple linear bonding curve for now
    // Price increases with supply
    const basePrice = 0.0001; // Base price per token
    const priceIncrease = tokenSupply * 0.000001;
    return (basePrice + priceIncrease) * amount;
  };

  const calculateSellPrice = (amount: number) => {
    // Slightly lower than buy price (spread)
    const buyPrice = calculateBuyPrice(amount);
    return buyPrice * 0.95; // 5% spread
  };

  const handleBuy = async () => {
    if (!connected || !wallet) {
      alert('Please connect your wallet');
      return;
    }

    const amount = parseFloat(buyAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const tonAmount = toNano(amount.toString());
    const fee = tonAmount * BigInt(FEE_PERCENT) / BigInt(100);
    const totalAmount = tonAmount + fee;

    if (totalLiquidity + amount > MAX_TON_LIQUIDITY) {
      alert(`Maximum liquidity of ${MAX_TON_LIQUIDITY} TON reached. Token will be listed on DEX.`);
      return;
    }

    setLoading(true);
    try {
      // TODO: Send buy transaction to cookpad contract
      // For now, just show success
      alert('Buy transaction will be implemented with contract');
    } catch (error: any) {
      alert(error.message || 'Buy failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    if (!connected || !wallet) {
      alert('Please connect your wallet');
      return;
    }

    const amount = parseFloat(sellAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      // TODO: Send sell transaction to cookpad contract
      alert('Sell transaction will be implemented with contract');
    } catch (error: any) {
      alert(error.message || 'Sell failed');
    } finally {
      setLoading(false);
    }
  };

  const buyPrice = buyAmount ? calculateBuyPrice(parseFloat(buyAmount)) : 0;
  const sellPrice = sellAmount ? calculateSellPrice(parseFloat(sellAmount)) : 0;
  const buyFee = buyPrice * (FEE_PERCENT / 100);
  const totalBuyCost = buyPrice + buyFee;

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
          <div className="flex justify-center mb-6">
            <Image 
              src="https://em-content.zobj.net/source/telegram/386/cooking_1f373.webp" 
              alt="Cookpad" 
              width={100}
              height={100}
              className="drop-shadow-lg"
              unoptimized
            />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-cook-text mb-2 text-center">
            <span className="gradient-text-cook">Cookpad</span>
          </h1>
          <p className="text-cook-text-secondary text-center mb-8">
            Memepad with bonding curve. Virtual liquidity until 300 TON, then DEX listing.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="card text-center">
              <p className="text-sm text-cook-text-secondary mb-1">Total Liquidity</p>
              <p className="text-2xl font-bold text-cook-text">
                {totalLiquidity.toFixed(2)} / {MAX_TON_LIQUIDITY} TON
              </p>
              <div className="mt-2 w-full bg-cook-bg-secondary rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-yellow-600 h-2 rounded-full transition-all"
                  style={{ width: `${(totalLiquidity / MAX_TON_LIQUIDITY) * 100}%` }}
                />
              </div>
            </div>
            <div className="card text-center">
              <p className="text-sm text-cook-text-secondary mb-1">Token Supply</p>
              <p className="text-2xl font-bold text-cook-text">
                {tokenSupply.toLocaleString()}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-cook-text-secondary mb-1">Current Price</p>
              <p className="text-2xl font-bold text-cook-text">
                {currentPrice > 0 ? `${currentPrice.toFixed(8)} TON` : 'N/A'}
              </p>
            </div>
          </div>

          {/* Buy/Sell Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Buy */}
            <div className="card">
              <h2 className="text-2xl font-bold text-cook-text mb-4">Buy Tokens</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-cook-text mb-2">
                    Amount (TON)
                  </label>
                  <input
                    type="number"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="0.0"
                    step="0.1"
                    className="input-ton"
                  />
                </div>
                {buyAmount && (
                  <div className="p-4 bg-cook-bg-secondary rounded-xl space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-cook-text-secondary">Price</span>
                      <span className="text-cook-text font-medium">{buyPrice.toFixed(6)} TON</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-cook-text-secondary">Fee ({FEE_PERCENT}%)</span>
                      <span className="text-cook-text font-medium">{buyFee.toFixed(6)} TON</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-cook-border">
                      <span className="text-cook-text">Total</span>
                      <span className="text-cook-orange">{totalBuyCost.toFixed(6)} TON</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleBuy}
                  disabled={!connected || !buyAmount || loading || totalLiquidity >= MAX_TON_LIQUIDITY}
                  className="btn-cook w-full"
                >
                  {loading ? 'Processing...' : 'Buy Tokens'}
                </button>
              </div>
            </div>

            {/* Sell */}
            <div className="card">
              <h2 className="text-2xl font-bold text-cook-text mb-4">Sell Tokens</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-cook-text mb-2">
                    Amount (Tokens)
                  </label>
                  <input
                    type="number"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    placeholder="0"
                    step="1"
                    className="input-ton"
                  />
                </div>
                {sellAmount && (
                  <div className="p-4 bg-cook-bg-secondary rounded-xl space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-cook-text-secondary">You'll receive</span>
                      <span className="text-cook-text font-medium">{sellPrice.toFixed(6)} TON</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-cook-text-secondary">Fee ({FEE_PERCENT}%)</span>
                      <span className="text-cook-text font-medium">{(sellPrice * FEE_PERCENT / 100).toFixed(6)} TON</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-cook-border">
                      <span className="text-cook-text">Total</span>
                      <span className="text-cook-orange">{(sellPrice * (1 - FEE_PERCENT / 100)).toFixed(6)} TON</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleSell}
                  disabled={!connected || !sellAmount || loading}
                  className="btn-cook w-full"
                >
                  {loading ? 'Processing...' : 'Sell Tokens'}
                </button>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="card mt-6">
            <h3 className="text-lg font-bold text-cook-text mb-4">How Cookpad Works</h3>
            <div className="space-y-3 text-cook-text-secondary">
              <p>
                <strong className="text-cook-text">Bonding Curve:</strong> Token price increases as more tokens are bought. 
                The bonding curve creates virtual liquidity until 300 TON is reached.
              </p>
              <p>
                <strong className="text-cook-text">Fees:</strong> {FEE_PERCENT}% of each transaction goes to the fee wallet.
              </p>
              <p>
                <strong className="text-cook-text">DEX Listing:</strong> Once 300 TON liquidity is reached, 
                the token will be automatically listed on STON.fi DEX for trading.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

