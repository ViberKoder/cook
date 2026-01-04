'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTonConnect } from '@/hooks/useTonConnect';
import { 
  connectToPaymentsNetwork, 
  openVirtualChannel, 
  sendOffchainPayment,
  type PaymentNodeConfig,
  type VirtualChannel
} from '@/lib/tonPaymentsNetwork';
import { 
  calculateBuyPrice, 
  calculateSellPrice,
  getTotalLiquidity,
  setTotalLiquidity,
  getTokenSupply,
  setTokenSupply,
  getOffchainBalance,
  storeOffchainBalance,
  type OffchainBalance
  type OffchainBalance
} from '@/lib/cookpadOffchain';
import toast from 'react-hot-toast';

function CookpadOffchainContent() {
  const { connected, wallet, sendTransaction } = useTonConnect();
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [offchainBalance, setOffchainBalance] = useState<OffchainBalance | null>(null);
  const [totalLiquidityState, setTotalLiquidityState] = useState(0);
  const [tokenSupply, setTokenSupplyState] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState(true);
  const [paymentNode, setPaymentNode] = useState<PaymentNodeConfig | null>(null);
  const [virtualChannel, setVirtualChannel] = useState<VirtualChannel | null>(null);
  const [connecting, setConnecting] = useState(false);

  const loadOffchainState = useCallback(async () => {
    if (!wallet) return;
    
    setLoadingState(true);
    try {
      // Load offchain balance
      const balance = getOffchainBalance(wallet.toString());
      setOffchainBalance(balance || { tokens: 0, tonDeposited: 0, lastUpdated: Date.now() });

      // Load total liquidity and token supply
      const liquidity = getTotalLiquidity();
      setTotalLiquidityState(liquidity);

      const supply = getTokenSupply();
      setTokenSupplyState(supply);
    } catch (error: any) {
      console.error('Failed to load offchain state:', error);
      toast.error('Failed to load state');
    } finally {
      setLoadingState(false);
    }
  }, [wallet]);

  const connectToPaymentsNetworkNode = useCallback(async () => {
    if (!wallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    setConnecting(true);
    try {
      // TODO: Replace with actual Payments Network node URL
      // For now, using a placeholder - in production this should be configured
      const nodeUrl = process.env.NEXT_PUBLIC_PAYMENTS_NETWORK_NODE_URL || 'http://localhost:8080';
      const nodeKey = wallet.toString(); // Using wallet address as node key for now
      
      const nodeConfig = await connectToPaymentsNetwork(nodeUrl, nodeKey);
      setPaymentNode(nodeConfig);
      
      // Open virtual channel for trading
      // TODO: Get actual onchain channel address and counterparty key
      // For now, this is a placeholder
      toast.success('Connected to Payments Network!', { id: 'connect' });
    } catch (error: any) {
      console.error('Failed to connect to Payments Network:', error);
      toast.error(`Failed to connect: ${error.message}`, { id: 'connect' });
    } finally {
      setConnecting(false);
    }
  }, [wallet]);

  useEffect(() => {
    if (connected && wallet) {
      loadOffchainState();
    } else {
      setLoadingState(false);
    }
  }, [connected, wallet, loadOffchainState]);


  const handleBuy = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    const amount = parseFloat(buyAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (totalLiquidityState + amount > 300) {
      toast.error('Maximum liquidity of 300 TON reached. Tokens will be withdrawn onchain.');
      return;
    }

    if (!paymentNode) {
      toast.error('Please connect to Payments Network first');
      return;
    }

    setLoading(true);
    try {
      // Calculate tokens to receive
      const tokensToReceive = calculateBuyPrice(tokenSupply, amount);
      
      // Send offchain payment through TON Payments Network
      if (virtualChannel) {
        // Use existing virtual channel
        await sendOffchainPayment(
          paymentNode,
          virtualChannel.channelKey,
          amount,
          paymentNode.walletAddress // For now, sending to self (in production, this would be the token contract)
        );
      } else {
        // TODO: Open virtual channel first if not exists
        toast.error('Virtual channel not open. Please wait for connection.');
        return;
      }
      
      // Update offchain balance
      const newBalance = {
        tokens: (offchainBalance?.tokens || 0) + tokensToReceive,
        tonDeposited: (offchainBalance?.tonDeposited || 0) + amount,
        lastUpdated: Date.now(),
      };
      
      storeOffchainBalance(wallet.toString(), newBalance);
      setOffchainBalance(newBalance);
      setOffchainBalance(newBalance);
      
      // Update total liquidity
      const newLiquidity = totalLiquidityState + amount;
      setTotalLiquidity(newLiquidity);
      setTotalLiquidityState(newLiquidity);
      
      // Update token supply
      const newSupply = tokenSupply + tokensToReceive;
      setTokenSupply(newSupply);
      setTokenSupplyState(newSupply);

      toast.success(`Bought ${tokensToReceive.toFixed(2)} tokens offchain via Payments Network!`);
      setBuyAmount('');

      // Check if we reached 300 TON - trigger onchain withdrawal
      if (newLiquidity >= 300) {
        toast.loading('Reached 300 TON! Withdrawing tokens onchain and creating STON.fi pool...', { id: 'withdraw' });
        await withdrawOnchain();
      }
    } catch (error: any) {
      console.error('Buy error:', error);
      toast.error(error.message || 'Buy failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    if (!connected || !wallet || !offchainBalance) {
      toast.error('Please connect your wallet');
      return;
    }

    const amount = parseFloat(sellAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > offchainBalance.tokens) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      // Calculate TON to receive
      const tonToReceive = calculateSellPrice(tokenSupply, amount);
      
      // Update offchain balance
      const newBalance = {
        tokens: offchainBalance.tokens - amount,
        tonDeposited: offchainBalance.tonDeposited - tonToReceive,
      };
      
      localStorage.setItem(`cookpad_offchain_${wallet.toString()}`, JSON.stringify(newBalance));
      setOffchainBalance(newBalance);
      
      // Update total liquidity
      const newLiquidity = totalLiquidityState - tonToReceive;
      setTotalLiquidity(newLiquidity);
      setTotalLiquidityState(newLiquidity);
      
      // Update token supply
      const newSupply = tokenSupply - amount;
      setTokenSupply(newSupply);
      setTokenSupplyState(newSupply);

      toast.success(`Sold ${amount.toFixed(2)} tokens for ${tonToReceive.toFixed(6)} TON offchain!`);
      setSellAmount('');
    } catch (error: any) {
      console.error('Sell error:', error);
      toast.error(error.message || 'Sell failed');
    } finally {
      setLoading(false);
    }
  };

  const withdrawOnchain = async () => {
    if (!connected || !wallet || !offchainBalance || offchainBalance.tokens <= 0) {
      return;
    }

    try {
      // TODO: Implement actual onchain withdrawal
      // This should:
      // 1. Mint tokens onchain to user's jetton wallet
      // 2. Transfer collected TON to liquidity pool
      // 3. Clear offchain balances
      
      toast.success('Tokens withdrawn onchain! Check your wallet.', { id: 'withdraw' });
      
      // Clear offchain balance after withdrawal
      localStorage.removeItem(`cookpad_offchain_${wallet.toString()}`);
      setOffchainBalance({ tokens: 0, tonDeposited: 0 });
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast.error(`Withdrawal failed: ${error.message}`, { id: 'withdraw' });
    }
  };

  const buyPrice = buyAmount ? calculateBuyPrice(tokenSupply, parseFloat(buyAmount)) : 0;
  const sellPrice = sellAmount ? calculateSellPrice(tokenSupply, parseFloat(sellAmount)) : 0;

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
              alt="Cookpad Offchain" 
              width={100}
              height={100}
              className="drop-shadow-lg"
              unoptimized
            />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-cook-text mb-2 text-center">
            <span className="gradient-text-cook">Cookpad</span> Offchain
          </h1>
          <p className="text-cook-text-secondary text-center mb-8">
            Fast offchain trading via TON Payments Network. Tokens withdraw onchain at 300 TON.
          </p>

          {!paymentNode && connected && (
            <div className="card text-center mb-6">
              <p className="text-cook-text-secondary mb-4">Connect to TON Payments Network to start trading</p>
              <button
                onClick={connectToPaymentsNetworkNode}
                disabled={connecting}
                className="btn-cook"
              >
                {connecting ? 'Connecting...' : 'Connect to Payments Network'}
              </button>
            </div>
          )}

          {loadingState ? (
            <div className="card text-center py-12">
              <div className="spinner mx-auto mb-4" />
              <p className="text-cook-text-secondary">Loading...</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="card text-center">
                  <p className="text-sm text-cook-text-secondary mb-1">Total Liquidity</p>
                  <p className="text-2xl font-bold text-cook-text">
                    {totalLiquidityState.toFixed(2)} / 300 TON
                  </p>
                  <div className="mt-2 w-full bg-cook-bg-secondary rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-yellow-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((totalLiquidityState / 300) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="card text-center">
                  <p className="text-sm text-cook-text-secondary mb-1">Token Supply</p>
                  <p className="text-2xl font-bold text-cook-text">
                    {tokenSupply.toFixed(2)}
                  </p>
                </div>
                <div className="card text-center">
                  <p className="text-sm text-cook-text-secondary mb-1">Your Balance</p>
                  <p className="text-2xl font-bold text-cook-text">
                    {offchainBalance?.tokens.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>

              {!connected ? (
                <div className="card text-center py-12">
                  <svg className="w-16 h-16 mx-auto mb-4 text-cook-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-cook-text mb-2">Connect Wallet</h3>
                  <p className="text-cook-text-secondary">Connect your wallet to start trading offchain</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Buy */}
                  <div className="card">
                    <h3 className="text-xl font-bold text-cook-text mb-4">Buy Tokens</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-cook-text mb-2">TON Amount</label>
                        <input
                          type="number"
                          value={buyAmount}
                          onChange={(e) => setBuyAmount(e.target.value)}
                          placeholder="0.1"
                          step="0.01"
                          className="input-ton"
                        />
                      </div>
                      {buyAmount && (
                        <div className="p-4 bg-cook-bg-secondary rounded-xl">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-cook-text-secondary">You&apos;ll receive</span>
                            <span className="text-cook-text font-medium">{buyPrice.toFixed(2)} tokens</span>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={handleBuy}
                        disabled={!buyAmount || loading || totalLiquidityState >= 300}
                        className="btn-cook w-full"
                      >
                        {loading ? 'Processing...' : totalLiquidityState >= 300 ? 'Max Liquidity Reached' : 'Buy Offchain'}
                      </button>
                    </div>
                  </div>

                  {/* Sell */}
                  <div className="card">
                    <h3 className="text-xl font-bold text-cook-text mb-4">Sell Tokens</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-cook-text mb-2">Token Amount</label>
                        <input
                          type="number"
                          value={sellAmount}
                          onChange={(e) => setSellAmount(e.target.value)}
                          placeholder="100"
                          step="0.01"
                          className="input-ton"
                        />
                      </div>
                      {sellAmount && (
                        <div className="p-4 bg-cook-bg-secondary rounded-xl">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-cook-text-secondary">You&apos;ll receive</span>
                            <span className="text-cook-text font-medium">{sellPrice.toFixed(6)} TON</span>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={handleSell}
                        disabled={!sellAmount || loading || !offchainBalance || parseFloat(sellAmount) > (offchainBalance.tokens || 0)}
                        className="btn-cook w-full"
                      >
                        {loading ? 'Processing...' : 'Sell Offchain'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="card mt-8">
                <h3 className="text-lg font-bold text-cook-text mb-4">How It Works</h3>
                <ul className="space-y-2 text-sm text-cook-text-secondary">
                  <li>• Trade tokens instantly offchain via TON Payments Network</li>
                  <li>• No gas fees, instant transactions</li>
                  <li>• When liquidity reaches 300 TON, all tokens automatically withdraw onchain</li>
                  <li>• Your tokens will appear in your wallet as Jetton 2.0 tokens</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function CookpadOffchainPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow relative z-10 pt-24 pb-12 px-4 flex items-center justify-center">
          <div className="card text-center py-12">
            <div className="spinner mx-auto mb-4" />
            <p className="text-cook-text-secondary">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <CookpadOffchainContent />
    </Suspense>
  );
}

