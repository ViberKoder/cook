'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTonConnect } from '@/hooks/useTonConnect';
import { Address } from '@ton/core';
import { loadJettonInfo, JettonInfo, sendMintTransaction, sendChangeMetadataTransaction, sendChangeAdminTransaction, sendDropAdminTransaction, sendAddToCooksTransaction } from '@/lib/admin';
import { addCookToken, setTokenDeployedAt } from '@/lib/cookTokens';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { connected, wallet, sendTransaction } = useTonConnect();
  const [contractAddress, setContractAddress] = useState('');
  const [jettonInfo, setJettonInfo] = useState<JettonInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'mint' | 'metadata' | 'admin'>('info');
  
  // Mint fields
  const [mintAmount, setMintAmount] = useState('');
  const [mintTo, setMintTo] = useState('');
  
  // Metadata fields
  const [newName, setNewName] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newDecimals, setNewDecimals] = useState('9');
  const [useOffchainUrl, setUseOffchainUrl] = useState(false);
  const [offchainUrl, setOffchainUrl] = useState('');
  
  // Admin fields
  const [newAdmin, setNewAdmin] = useState('');
  
  // Add to Cooks
  const [addingToCooks, setAddingToCooks] = useState(false);
  
  const loadedAddressRef = useRef<string>('');
  const isLoadingRef = useRef(false);

  // Get address from URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const address = params.get('address');
      if (address) {
        setContractAddress(address);
      }
    }
  }, []);

  const handleLoadJetton = useCallback(async (showToast = true) => {
    if (!contractAddress) {
      if (showToast) toast.error('Please enter a contract address');
      return;
    }

    if (isLoadingRef.current) return;
    if (loadedAddressRef.current === contractAddress && jettonInfo) return;

    isLoadingRef.current = true;
    setLoading(true);
    
    try {
      const info = await loadJettonInfo(contractAddress);
      setJettonInfo(info);
      
      // Pre-fill metadata fields
      setNewName(info.name);
      setNewSymbol(info.symbol);
      setNewDescription(info.description);
      setNewImage(info.image);
      setNewDecimals(info.decimals.toString());
      
      loadedAddressRef.current = contractAddress;
      if (showToast) toast.success('Token info loaded');
    } catch (error: any) {
      console.error('Failed to load jetton:', error);
      if (showToast) toast.error(error.message || 'Failed to load token info');
      
      // Set default info if not loaded
      if (!jettonInfo) {
        setJettonInfo({
          totalSupply: '0',
          adminAddress: wallet ? wallet.toString() : null,
          mintable: true,
          name: 'Unknown Token',
          symbol: '???',
          description: 'Token not yet indexed.',
          image: '',
          decimals: 9,
        });
        loadedAddressRef.current = contractAddress;
      }
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [contractAddress, wallet, jettonInfo]);

  useEffect(() => {
    if (contractAddress && !loadedAddressRef.current) {
      handleLoadJetton(false);
    }
  }, [contractAddress, handleLoadJetton]);

  const handleMint = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!mintAmount || !mintTo) {
      toast.error('Please fill all fields');
      return;
    }

    if (!jettonInfo) {
      toast.error('Please load token info first');
      return;
    }

    try {
      if (!wallet) {
        throw new Error('Wallet not connected');
      }
      await sendMintTransaction(
        contractAddress,
        mintTo,
        mintAmount,
        jettonInfo.decimals,
        wallet,
        sendTransaction
      );

      toast.success('Mint transaction sent!');
      setMintAmount('');
      setMintTo('');
      
      // Refresh token info after a delay
      setTimeout(() => {
        loadedAddressRef.current = '';
        handleLoadJetton(false);
      }, 3000);
    } catch (error: any) {
      toast.error(error.message || 'Mint error');
    }
  };

  const handleChangeMetadata = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!jettonInfo) {
      toast.error('Please load token info first');
      return;
    }

    try {
      await sendChangeMetadataTransaction(
        contractAddress,
        {
          name: newName,
          symbol: newSymbol,
          description: newDescription,
          image: newImage,
          decimals: newDecimals,
        },
        useOffchainUrl,
        sendTransaction,
        offchainUrl
      );

      toast.success('Metadata change transaction sent!');
      
      // Refresh token info after a delay
      setTimeout(() => {
        loadedAddressRef.current = '';
        handleLoadJetton(false);
      }, 3000);
    } catch (error: any) {
      toast.error(error.message || 'Metadata change error');
    }
  };

  const handleChangeAdmin = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!newAdmin) {
      toast.error('Please enter new admin address');
      return;
    }

    try {
      await sendChangeAdminTransaction(
        contractAddress,
        newAdmin,
        sendTransaction
      );

      toast.success('Admin change request sent!');
      setNewAdmin('');
      
      // Refresh token info after a delay
      setTimeout(() => {
        loadedAddressRef.current = '';
        handleLoadJetton(false);
      }, 3000);
    } catch (error: any) {
      toast.error(error.message || 'Admin change error');
    }
  };

  const handleRevokeAdmin = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      await sendDropAdminTransaction(contractAddress, sendTransaction);
      toast.success('Admin rights revoked!');
      
      // Refresh token info after a delay
      setTimeout(() => {
        loadedAddressRef.current = '';
        handleLoadJetton(false);
      }, 3000);
    } catch (error: any) {
      toast.error(error.message || 'Revoke error');
    }
  };

  const isAdmin = jettonInfo?.adminAddress && wallet && 
    Address.parse(jettonInfo.adminAddress).equals(wallet);

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

  const handleRefresh = () => {
    loadedAddressRef.current = '';
    setJettonInfo(null);
    handleLoadJetton(true);
  };

  const handleAddToCooks = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!contractAddress) {
      toast.error('Please enter a contract address');
      return;
    }

    setAddingToCooks(true);
    try {
      await sendAddToCooksTransaction(sendTransaction);
      addCookToken(contractAddress);
      setTokenDeployedAt(contractAddress);
      toast.success('Token added to Cooks! Payment of 0.2 TON processed.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add token to Cooks');
    } finally {
      setAddingToCooks(false);
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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-cook-text mb-2 text-center">
            Manage <span className="gradient-text-cook">Token</span>
          </h1>
          <p className="text-cook-text-secondary text-center mb-8">
            Jetton 2.0 Admin Panel
          </p>

          {/* Contract Address Input */}
          <div className="card mb-8">
            <label className="block text-sm font-medium text-cook-text mb-2">
              Contract Address
            </label>
            <div className="flex gap-4">
              <input
                type="text"
                value={contractAddress}
                onChange={(e) => {
                  setContractAddress(e.target.value);
                  loadedAddressRef.current = '';
                }}
                placeholder="EQ... or UQ..."
                className="input-ton flex-grow"
              />
              <button
                onClick={() => handleLoadJetton(true)}
                disabled={loading || !contractAddress}
                className="btn-cook whitespace-nowrap"
              >
                {loading ? 'Loading...' : 'Load'}
              </button>
            </div>
          </div>

          {jettonInfo && (
            <>
              {/* Token Preview Card */}
              <div className="card mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-cook-bg-secondary overflow-hidden flex-shrink-0 border border-cook-border">
                    {jettonInfo.image ? (
                      <Image 
                        src={jettonInfo.image} 
                        alt={jettonInfo.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized={true}
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-cook-text-secondary">
                        {jettonInfo.symbol?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-bold text-cook-text">{jettonInfo.name || 'Unnamed Token'}</h3>
                    <p className="text-cook-text-secondary">${jettonInfo.symbol || 'UNKNOWN'}</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {isAdmin && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: 'rgba(220, 252, 231, 0.15)' }}>
                        <span className="font-bold" style={{ color: '#10b981' }}>You are Admin</span>
                      </span>
                    )}
                    <button
                      onClick={handleRefresh}
                      className="text-sm text-cook-orange hover:underline flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex space-x-2 mb-6 p-1 bg-cook-bg-secondary rounded-xl overflow-x-auto">
                {[
                  { id: 'info', label: 'Info' },
                  { id: 'mint', label: 'Mint' },
                  { id: 'metadata', label: 'Metadata' },
                  { id: 'admin', label: 'Admin' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-gradient-cook text-white shadow-cook'
                        : 'text-cook-text-secondary hover:text-cook-text'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="card">
                {activeTab === 'info' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-cook-border">
                      <span className="text-cook-text-secondary">Name</span>
                      <span className="text-cook-text font-medium">{jettonInfo.name || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-cook-border">
                      <span className="text-cook-text-secondary">Symbol</span>
                      <span className="text-cook-text font-medium">{jettonInfo.symbol || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-cook-border">
                      <span className="text-cook-text-secondary">Total Supply</span>
                      <span className="text-cook-text font-medium">
                        {formatSupply(jettonInfo.totalSupply, jettonInfo.decimals)} {jettonInfo.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-cook-border">
                      <span className="text-cook-text-secondary">Decimals</span>
                      <span className="text-cook-text font-medium">{jettonInfo.decimals}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-cook-text-secondary">Admin</span>
                      {jettonInfo.adminAddress ? (
                        <code className="text-cook-orange text-sm">
                          {jettonInfo.adminAddress.slice(0, 8)}...{jettonInfo.adminAddress.slice(-6)}
                        </code>
                      ) : (
                        <span className="text-cook-text-secondary">Decentralized</span>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'mint' && (
                  <div className="space-y-6">
                    {!isAdmin && jettonInfo.adminAddress && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <p className="text-red-600 dark:text-red-400 text-sm">You are not the admin of this token.</p>
                      </div>
                    )}

                    {!jettonInfo.mintable && (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                        <p className="text-yellow-600 dark:text-yellow-400 text-sm">This token is not mintable.</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-cook-text mb-2">Amount to Mint</label>
                      <input
                        type="text"
                        value={mintAmount}
                        onChange={(e) => setMintAmount(e.target.value)}
                        placeholder="1000000"
                        className="input-ton"
                        disabled={!isAdmin || !jettonInfo.mintable}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-cook-text mb-2">Recipient Address</label>
                      <input
                        type="text"
                        value={mintTo}
                        onChange={(e) => setMintTo(e.target.value)}
                        placeholder="EQ..."
                        className="input-ton"
                        disabled={!isAdmin || !jettonInfo.mintable}
                      />
                      {wallet && isAdmin && (
                        <button 
                          onClick={() => setMintTo(wallet.toString())} 
                          className="text-sm text-cook-orange hover:underline mt-1"
                        >
                          Use my address
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={handleMint} 
                      disabled={!connected || !mintAmount || !mintTo || !isAdmin || !jettonInfo.mintable} 
                      className="btn-cook w-full"
                    >
                      Mint Tokens
                    </button>
                  </div>
                )}

                {activeTab === 'metadata' && (
                  <div className="space-y-6">
                    {!isAdmin && jettonInfo.adminAddress && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <p className="text-red-600 dark:text-red-400 text-sm">You are not the admin of this token.</p>
                      </div>
                    )}

                    {!jettonInfo.adminAddress && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                        <p className="text-cook-text-secondary text-sm">This token is decentralized. Metadata cannot be changed.</p>
                      </div>
                    )}

                    {isAdmin && (
                      <>
                        <div className="p-4 bg-cook-bg-secondary rounded-xl border border-cook-border">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={useOffchainUrl}
                              onChange={(e) => setUseOffchainUrl(e.target.checked)}
                              className="mr-2 accent-cook-orange"
                            />
                            <span className="text-sm text-cook-text">Use off-chain metadata URL</span>
                          </label>
                        </div>

                        {useOffchainUrl ? (
                          <div>
                            <label className="block text-sm font-medium text-cook-text mb-2">Metadata URL</label>
                            <input
                              type="url"
                              value={offchainUrl}
                              onChange={(e) => setOffchainUrl(e.target.value)}
                              placeholder="https://example.com/metadata.json"
                              className="input-ton"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-cook-text mb-2">Name</label>
                                <input 
                                  type="text" 
                                  value={newName} 
                                  onChange={(e) => setNewName(e.target.value)} 
                                  className="input-ton" 
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-cook-text mb-2">Symbol</label>
                                <input 
                                  type="text" 
                                  value={newSymbol} 
                                  onChange={(e) => setNewSymbol(e.target.value)} 
                                  className="input-ton" 
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cook-text mb-2">Description</label>
                              <textarea 
                                value={newDescription} 
                                onChange={(e) => setNewDescription(e.target.value)} 
                                className="input-ton min-h-[80px]" 
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-cook-text mb-2">Image URL</label>
                                <input 
                                  type="url" 
                                  value={newImage} 
                                  onChange={(e) => setNewImage(e.target.value)} 
                                  className="input-ton" 
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-cook-text mb-2">Decimals</label>
                                <input 
                                  type="number" 
                                  value={newDecimals} 
                                  onChange={(e) => setNewDecimals(e.target.value)} 
                                  min={0} 
                                  max={18} 
                                  className="input-ton" 
                                />
                              </div>
                            </div>
                          </>
                        )}

                        <button 
                          onClick={handleChangeMetadata} 
                          disabled={!connected} 
                          className="btn-cook w-full"
                        >
                          Update Metadata
                        </button>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'admin' && (
                  <div className="space-y-6">
                    {!isAdmin && jettonInfo.adminAddress && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <p className="text-red-600 dark:text-red-400 text-sm">You are not the admin of this token.</p>
                      </div>
                    )}

                    {isAdmin && (
                      <>
                        <div className="p-6 bg-cook-bg-secondary rounded-xl border border-cook-border">
                          <h4 className="font-semibold text-cook-text mb-2">Transfer Admin Rights</h4>
                          <input
                            type="text"
                            value={newAdmin}
                            onChange={(e) => setNewAdmin(e.target.value)}
                            placeholder="EQ..."
                            className="input-ton mb-4"
                          />
                          <button 
                            onClick={handleChangeAdmin} 
                            disabled={!connected || !newAdmin} 
                            className="btn-cook w-full"
                          >
                            Transfer Rights
                          </button>
                        </div>

                        <div className="p-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 dark:border-orange-700 rounded-xl mb-4">
                          <h4 className="font-semibold text-cook-text mb-2">Add Token to Cooks</h4>
                          <p className="text-sm text-cook-text-secondary mb-4">
                            Pay 0.2 TON to add your token to the Cooks section. Your token will appear immediately without any filters.
                          </p>
                          <button 
                            onClick={handleAddToCooks} 
                            disabled={!connected || addingToCooks || !contractAddress} 
                            className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-yellow-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {addingToCooks ? (
                              <>
                                <div className="spinner" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Image 
                                  src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
                                  alt="" 
                                  width={20}
                                  height={20}
                                  unoptimized
                                />
                                Add on Cooks (0.2 TON)
                              </>
                            )}
                          </button>
                        </div>

                        <div className="p-6 rounded-xl border-2 border-red-400 dark:border-red-700 shadow-lg relative overflow-hidden animate-gradient" style={{
                          background: 'linear-gradient(-45deg, #ef4444, #dc2626, #b91c1c, #991b1b, #dc2626, #ef4444)',
                          backgroundSize: '200% 200%',
                        }}>
                          <div className="relative z-10">
                            <h4 className="font-semibold text-white mb-2">Danger Zone</h4>
                            <p className="text-sm text-white mb-4">
                              Revoking admin rights is <strong className="text-white">IRREVERSIBLE</strong>. The token will become fully decentralized.
                            </p>
                            <button 
                              onClick={handleRevokeAdmin} 
                              disabled={!connected} 
                              className="w-full py-3 px-6 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/30 hover:bg-white/30"
                            >
                              🔒 Revoke Admin Rights
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {!connected && (
            <div className="card text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-cook-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-xl font-semibold text-cook-text mb-2">Connect Wallet</h3>
              <p className="text-cook-text-secondary">Connect your wallet to manage tokens</p>
            </div>
          )}

          {/* My Jettons Button */}
          {connected && (
            <div className="card text-center mt-8">
              <h3 className="text-lg font-semibold text-cook-text mb-2">Manage Your Tokens</h3>
              <p className="text-cook-text-secondary text-sm mb-4">
                View and manage all tokens you've created without entering addresses manually
              </p>
              <Link
                href="/my-jettons"
                className="btn-cook inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                My Jettons
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
