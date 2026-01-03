import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTonConnect } from '@/hooks/useTonConnect';
import { Address, toNano, beginCell } from '@ton/core';
import { buildOnchainMetadataCell, buildChangeMetadataMessage } from '@/utils/onchain-metadata';
import toast from 'react-hot-toast';

interface JettonInfo {
  totalSupply: string;
  adminAddress: string | null;
  mintable: boolean;
  name: string;
  symbol: string;
  description: string;
  image: string;
  decimals: number;
}

// Jetton 2.0 Operation codes
const Opcodes = {
  mint: 0x642b7d07,
  changeAdmin: 0x6501f354,
  claimAdmin: 0xfb88e119,
  dropAdmin: 0x7431f221,
  changeMetadataUrl: 0xcb862902,
  internalTransfer: 0x178d4519,
};

export default function AdminPage() {
  const router = useRouter();
  const { connected, wallet, sendTransaction } = useTonConnect();
  const [contractAddress, setContractAddress] = useState('');
  const [jettonInfo, setJettonInfo] = useState<JettonInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [mintAmount, setMintAmount] = useState('');
  const [mintTo, setMintTo] = useState('');
  const [newAdmin, setNewAdmin] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'mint' | 'metadata' | 'admin'>('info');
  
  // Metadata editing
  const [newName, setNewName] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newDecimals, setNewDecimals] = useState('9');
  
  const loadedAddressRef = useRef<string>('');
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (router.query.address && typeof router.query.address === 'string') {
      setContractAddress(router.query.address);
    }
  }, [router.query.address]);

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
      const address = Address.parse(contractAddress);
      const response = await fetch(`https://tonapi.io/v2/jettons/${address.toString()}`);
      
      if (!response.ok) {
        const altResponse = await fetch(`https://toncenter.com/api/v3/jetton/masters?address=${address.toString()}&limit=1`);
        if (!altResponse.ok) {
          throw new Error('Token not found');
        }
        const altData = await altResponse.json();
        if (!altData.jetton_masters || altData.jetton_masters.length === 0) {
          throw new Error('Token not found');
        }
        const master = altData.jetton_masters[0];
        const info: JettonInfo = {
          totalSupply: master.total_supply || '0',
          adminAddress: master.admin_address || null,
          mintable: master.mintable !== false,
          name: master.jetton_content?.name || '',
          symbol: master.jetton_content?.symbol || '',
          description: master.jetton_content?.description || '',
          image: master.jetton_content?.image || '',
          decimals: parseInt(master.jetton_content?.decimals || '9'),
        };
        setJettonInfo(info);
        // Pre-fill metadata fields
        setNewName(info.name);
        setNewSymbol(info.symbol);
        setNewDescription(info.description);
        setNewImage(info.image);
        setNewDecimals(info.decimals.toString());
        loadedAddressRef.current = contractAddress;
        if (showToast) toast.success('Token info loaded');
        return;
      }
      
      const data = await response.json();
      const info: JettonInfo = {
        totalSupply: data.total_supply || '0',
        adminAddress: data.admin?.address || null,
        mintable: data.mintable !== false,
        name: data.metadata?.name || '',
        symbol: data.metadata?.symbol || '',
        description: data.metadata?.description || '',
        image: data.metadata?.image || '',
        decimals: parseInt(data.metadata?.decimals || '9'),
      };
      
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
      
      if (!jettonInfo) {
        setJettonInfo({
          totalSupply: '0',
          adminAddress: wallet?.toString() || null,
          mintable: true,
          name: 'New Token',
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
    if (contractAddress && router.query.address && !loadedAddressRef.current) {
      handleLoadJetton(false);
    }
  }, [contractAddress, router.query.address, handleLoadJetton]);

  const handleMint = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!mintAmount || !mintTo) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const toAddress = Address.parse(mintTo);
      const decimals = jettonInfo?.decimals || 9;
      const amount = BigInt(mintAmount) * BigInt(10 ** decimals);
      
      const internalTransferMsg = beginCell()
        .storeUint(Opcodes.internalTransfer, 32)
        .storeUint(0, 64)
        .storeCoins(amount)
        .storeAddress(null)
        .storeAddress(wallet)
        .storeCoins(toNano('0.01'))
        .storeMaybeRef(null)
        .endCell();

      const mintBody = beginCell()
        .storeUint(Opcodes.mint, 32)
        .storeUint(0, 64)
        .storeAddress(toAddress)
        .storeCoins(toNano('0.1'))
        .storeRef(internalTransferMsg)
        .endCell();

      await sendTransaction({
        to: contractAddress,
        value: toNano('0.15').toString(),
        body: mintBody.toBoc().toString('base64'),
      });

      toast.success('Mint transaction sent!');
      setMintAmount('');
      setMintTo('');
    } catch (error: any) {
      toast.error(error.message || 'Mint error');
    }
  };

  const handleChangeMetadata = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const metadataCell = buildOnchainMetadataCell({
        name: newName,
        symbol: newSymbol,
        description: newDescription || undefined,
        image: newImage || undefined,
        decimals: newDecimals || '9',
      });
      
      const changeMetadataBody = buildChangeMetadataMessage(metadataCell);

      await sendTransaction({
        to: contractAddress,
        value: toNano('0.1').toString(),
        body: changeMetadataBody.toBoc().toString('base64'),
      });

      toast.success('Metadata change transaction sent!');
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
      const adminAddress = Address.parse(newAdmin);
      const changeAdminBody = beginCell()
        .storeUint(Opcodes.changeAdmin, 32)
        .storeUint(0, 64)
        .storeAddress(adminAddress)
        .endCell();

      await sendTransaction({
        to: contractAddress,
        value: toNano('0.1').toString(),
        body: changeAdminBody.toBoc().toString('base64'),
      });

      toast.success('Admin change request sent!');
      setNewAdmin('');
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
      const dropAdminBody = beginCell()
        .storeUint(Opcodes.dropAdmin, 32)
        .storeUint(0, 64)
        .endCell();

      await sendTransaction({
        to: contractAddress,
        value: toNano('0.05').toString(),
        body: dropAdminBody.toBoc().toString('base64'),
      });

      toast.success('Admin rights revoked!');
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

  return (
    <>
      <Head>
        <title>Manage Token | Cook</title>
        <link rel="icon" href="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" />
      </Head>

      <div className="min-h-screen flex flex-col">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/15 to-yellow-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-orange-300/10 to-amber-400/10 rounded-full blur-3xl" />
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
                        <img 
                          src={jettonInfo.image} 
                          alt={jettonInfo.name}
                          className="w-full h-full object-cover"
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
                        <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                          You are Admin
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
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                          <p className="text-red-600 text-sm">You are not the admin of this token.</p>
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
                          disabled={!isAdmin}
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
                          disabled={!isAdmin}
                        />
                        {wallet && isAdmin && (
                          <button onClick={() => setMintTo(wallet.toString())} className="text-sm text-cook-orange hover:underline mt-1">
                            Use my address
                          </button>
                        )}
                      </div>
                      <button onClick={handleMint} disabled={!connected || !mintAmount || !mintTo || !isAdmin} className="btn-cook w-full">
                        Mint Tokens
                      </button>
                    </div>
                  )}

                  {activeTab === 'metadata' && (
                    <div className="space-y-6">
                      {!isAdmin && jettonInfo.adminAddress && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                          <p className="text-red-600 text-sm">You are not the admin of this token.</p>
                        </div>
                      )}

                      {!jettonInfo.adminAddress && (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                          <p className="text-cook-text-secondary text-sm">This token is decentralized. Metadata cannot be changed.</p>
                        </div>
                      )}

                      {isAdmin && (
                        <>
                          <div className="p-4 bg-green-50 rounded-xl border border-green-200 mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">⛓️</span>
                              <span className="text-sm text-green-700 font-medium">On-chain metadata (TEP-64)</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-cook-text mb-2">Name</label>
                              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="input-ton" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cook-text mb-2">Symbol</label>
                              <input type="text" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} className="input-ton" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-cook-text mb-2">Description</label>
                            <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="input-ton min-h-[80px]" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-cook-text mb-2">Image URL</label>
                              <input type="url" value={newImage} onChange={(e) => setNewImage(e.target.value)} className="input-ton" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-cook-text mb-2">Decimals</label>
                              <input type="number" value={newDecimals} onChange={(e) => setNewDecimals(e.target.value)} min={0} max={18} className="input-ton" />
                            </div>
                          </div>

                          <button onClick={handleChangeMetadata} disabled={!connected} className="btn-cook w-full">
                            Update Metadata
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {activeTab === 'admin' && (
                    <div className="space-y-6">
                      {!isAdmin && jettonInfo.adminAddress && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                          <p className="text-red-600 text-sm">You are not the admin of this token.</p>
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
                            <button onClick={handleChangeAdmin} disabled={!connected || !newAdmin} className="btn-cook w-full">
                              Transfer Rights
                            </button>
                          </div>

                          <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
                            <h4 className="font-semibold text-red-600 mb-2">Danger Zone</h4>
                            <p className="text-sm text-cook-text-secondary mb-4">
                              Revoking admin rights is <strong>IRREVERSIBLE</strong>. The token will become fully decentralized.
                            </p>
                            <button onClick={handleRevokeAdmin} disabled={!connected} className="w-full py-3 px-6 bg-red-100 hover:bg-red-200 text-red-600 font-semibold rounded-xl transition-colors border border-red-300">
                              🔒 Revoke Admin Rights
                            </button>
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
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
