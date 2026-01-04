'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTonConnect } from '@/hooks/useTonConnect';
import { 
  loadCookpadState, 
  sendBuyTokensTransaction, 
  sendSellTokensTransaction,
  calculateBuyPrice,
  calculateSellPrice,
  type CookpadState
} from '@/lib/cookpad';
import { 
  COOKPAD_CONTRACT_ADDRESS,
  COOKPAD_FEE_WALLET,
  COOKPAD_MAX_LIQUIDITY_TON,
  COOKPAD_FEE_PERCENT
} from '@/lib/cookpadConfig';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

export default function CookpadPage() {
  const { connected, wallet, sendTransaction } = useTonConnect();
  const searchParams = useSearchParams();
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [cookpadState, setCookpadState] = useState<CookpadState | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState(true);
  
  // Contract address from config or URL parameter
  const contractFromUrl = searchParams.get('contract');
  const COOKPAD_CONTRACT = contractFromUrl || COOKPAD_CONTRACT_ADDRESS;

  useEffect(() => {
    if (COOKPAD_CONTRACT) {
      loadState();
    } else {
      setLoadingState(false);
    }
  }, [COOKPAD_CONTRACT]);

  const loadState = async () => {
    if (!COOKPAD_CONTRACT) return;
    
    setLoadingState(true);
    try {
      const state = await loadCookpadState(COOKPAD_CONTRACT);
      setCookpadState(state);
    } catch (error: any) {
      console.error('Failed to load cookpad state:', error);
      toast.error('Failed to load cookpad state');
    } finally {
      setLoadingState(false);
    }
  };

  const totalLiquidity = cookpadState ? parseFloat(cookpadState.totalLiquidity) / 1e9 : 0;
  const tokenSupply = cookpadState ? parseFloat(cookpadState.totalSupply) / 1e9 : 0;
  const currentPrice = cookpadState?.currentPrice || 0;
  
  // Use constants from config
  const MAX_LIQUIDITY_TON = COOKPAD_MAX_LIQUIDITY_TON;
  const FEE_PERCENT = COOKPAD_FEE_PERCENT;
  const FEE_WALLET = COOKPAD_FEE_WALLET;

  const handleBuy = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!COOKPAD_CONTRACT) {
      toast.error('Cookpad contract not deployed yet');
      return;
    }

    const amount = parseFloat(buyAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (totalLiquidity + amount > COOKPAD_MAX_LIQUIDITY_TON) {
      toast.error(`Maximum liquidity of ${COOKPAD_MAX_LIQUIDITY_TON} TON reached. Token will be listed on DEX.`);
      return;
    }

    // Calculate tokens to receive
    const tokensToReceive = calculateBuyPrice(tokenSupply, amount);
    const minTokens = tokensToReceive * 0.95; // 5% slippage tolerance

    setLoading(true);
    try {
      await sendBuyTokensTransaction(COOKPAD_CONTRACT, buyAmount, minTokens.toString(), sendTransaction, wallet?.toString());
      toast.success('Buy transaction sent!');
      setTimeout(() => loadState(), 3000); // Reload state after 3 seconds
    } catch (error: any) {
      toast.error(error.message || 'Buy failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!COOKPAD_CONTRACT) {
      toast.error('Cookpad contract not deployed yet');
      return;
    }

    const amount = parseFloat(sellAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Calculate TON to receive
    const tonToReceive = calculateSellPrice(tokenSupply, amount);
    const minTon = tonToReceive * 0.95; // 5% slippage tolerance

    setLoading(true);
    try {
      await sendSellTokensTransaction(COOKPAD_CONTRACT, sellAmount, minTon.toString(), sendTransaction, wallet?.toString());
      toast.success('Sell transaction sent!');
      setTimeout(() => loadState(), 3000); // Reload state after 3 seconds
    } catch (error: any) {
      toast.error(error.message || 'Sell failed');
    } finally {
      setLoading(false);
    }
  };

  // Calculate prices for display
  const buyPrice = buyAmount ? calculateBuyPrice(tokenSupply, parseFloat(buyAmount)) : 0;
  const sellPrice = sellAmount ? calculateSellPrice(tokenSupply, parseFloat(sellAmount)) : 0;
  const buyFee = buyPrice * (COOKPAD_FEE_PERCENT / 100);
  const totalBuyCost = parseFloat(buyAmount) + buyFee;

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
            Memepad with bonding curve. 100% of supply goes to bonding curve. After 300 TON, token goes to DEX.
          </p>

          {/* Create Cookpad Button */}
          {!COOKPAD_CONTRACT && (
            <div className="card text-center mb-8">
              <p className="text-cook-text-secondary mb-4">No Cookpad contract deployed yet.</p>
              <Link href="/cookpad/create" className="btn-cook inline-flex items-center gap-2">
                <Image 
                  src="https://em-content.zobj.net/source/telegram/386/cooking_1f373.webp" 
                  alt="" 
                  width={24}
                  height={24}
                  unoptimized
                />
                Create Cookpad Token
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="card text-center">
              <p className="text-sm text-cook-text-secondary mb-1">Total Liquidity</p>
              <p className="text-2xl font-bold text-cook-text">
                {totalLiquidity.toFixed(2)} / {COOKPAD_MAX_LIQUIDITY_TON} TON
              </p>
              <div className="mt-2 w-full bg-cook-bg-secondary rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-yellow-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((totalLiquidity / COOKPAD_MAX_LIQUIDITY_TON) * 100, 100)}%` }}
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
                      <span className="text-cook-text-secondary">Fee ({COOKPAD_FEE_PERCENT}%)</span>
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
                  disabled={!connected || !buyAmount || loading || totalLiquidity >= COOKPAD_MAX_LIQUIDITY_TON || !COOKPAD_CONTRACT}
                  className="btn-cook w-full"
                >
                  {loading ? 'Processing...' : totalLiquidity >= COOKPAD_MAX_LIQUIDITY_TON ? 'Max Liquidity Reached' : 'Buy Tokens'}
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
                      <span className="text-cook-text-secondary">You&apos;ll receive</span>
                      <span className="text-cook-text font-medium">{sellPrice.toFixed(6)} TON</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-cook-text-secondary">Fee ({COOKPAD_FEE_PERCENT}%)</span>
                      <span className="text-cook-text font-medium">{(sellPrice * COOKPAD_FEE_PERCENT / 100).toFixed(6)} TON</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-cook-border">
                      <span className="text-cook-text">Total</span>
                      <span className="text-cook-orange">{(sellPrice * (1 - COOKPAD_FEE_PERCENT / 100)).toFixed(6)} TON</span>
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
                <strong className="text-cook-text">Fees:</strong> {COOKPAD_FEE_PERCENT}% of each transaction goes to the fee wallet ({COOKPAD_FEE_WALLET.slice(0, 8)}...{COOKPAD_FEE_WALLET.slice(-6)}).
              </p>
              <p>
                <strong className="text-cook-text">DEX Listing:</strong> Once {COOKPAD_MAX_LIQUIDITY_TON} TON liquidity is reached, 
                the token will be automatically listed on STON.fi DEX for trading.
              </p>
              {!COOKPAD_CONTRACT && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    <strong>Note:</strong> Cookpad contract is not deployed yet. This is a preview interface.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

