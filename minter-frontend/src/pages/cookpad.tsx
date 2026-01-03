import { useState } from 'react';
import Head from 'next/head';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTonConnect } from '@/hooks/useTonConnect';
import { Address, beginCell, Cell, toNano, storeStateInit, contractAddress } from '@ton/core';
import toast, { Toaster } from 'react-hot-toast';
import { buildTokenMetadataCell } from '@/utils/onchain-metadata';
import Link from 'next/link';

// CookPad Configuration
const COOKPAD_FEE = toNano('2'); // 2 TON creation fee
const MONETIZATION_WALLET = 'UQDjQOdWTP1bPpGpYExAsCcVLGPN_pzGvdno3aCk565ZnQIz';
const BONDING_CURVE_TARGET = 300; // 300 TON target
const TRADE_FEE_PERCENT = 1; // 1% commission

// Bonding Curve Contract - Simple AMM with virtual liquidity
// This contract implements a basic x*y=k bonding curve with:
// - Virtual initial liquidity
// - Buy/Sell functions with 1% fee
// - Auto-graduation to STON.fi at 300 TON
const BONDING_CURVE_CODE_HEX = 'b5ee9c72410215010004e0000114ff00f4a413f4bcf2c80b0102016202100202cb030f02f7d0cb434c0c05c6c3000638ecc200835c874c7c0608405e351466ea44c38601035c87e800c3b51343e803e903e90353534541168504d3214017e809400f3c58073c5b333327b55383e903e900c7e800c7d007e800c7e80004c5c3e0e80b4c7c04074cfc044bb51343e803e903e9035353449a084190adf41eeb8c08e60408019635355161c705f2e04904fa4021fa4430c000f2e14dfa00d4d120d0d31f018210178d4519baf2e0488040d721fa00fa4031fa4031fa0020d70b009ad74bc00101c001b0f2b19130e254431b05018e2191729171e2f839206e9381239b9120e2216e94318128309101e25023a813a07381032c70f83ca00270f83612a00170f836a07381040282100966018070f837a0bcf2b025597f0601ea820898968070fb0224800bd721d70b07f82846057054201314c85003fa0201cf1601cf16c9227871c8cb00cb04cb0012f400f400cb00c9513384f701f90001b07074c8cb02ca0712cb07cbf7c9d0c8801801cb0501cf1658fa020397775003cb6bcccc96317158cb6acce2c98011fb005005a04314070022c85005fa025003cf1601cf16ccccc9ed5404e62582107bdd97debae3022582102c76b973ba8ecb355f033401fa40d2000101d195c821cf16c9916de2c8801001cb055004cf1670fa027001cb6a8210d173540001cb1f500401cb3f23fa4430c00097316c127001cb01e30df400c98050fb00e0342482106501f354bae302248210fb88e119ba090b0c0d01f23505fa00fa40f82854120722800bd721d70b0755207054201314c85003fa0201cf1601cf16c9227871c8cb00cb04cb0012f400f400cb00c984f701f90001b07074c8cb02ca0712cb07cbf7c9d05008c705f2e04a12a144145036c85005fa025003cf1601cf16ccccc9ed54fa40d120d70b01c000b3915be30d0a0044c8801001cb0501cf1670fa027001cb6a8210d53276db01cb1f0101cb3fc98042fb000092f828440422800bd721d70b0755207054201314c85003fa0201cf1601cf16c9227871c8cb00cb04cb0012f400f400cb00c984f701f90001b07074c8cb02ca0712cb07cbf7c9d012cf16004230335142c705f2e04902fa40d1400304c85005fa025003cf1601cf16ccccc9ed5401fe8e20313303d15131c705f2e0498b024034c85005fa025003cf1601cf16ccccc9ed54e02482107431f221ba8e2230335042c705f2e04901d18b028b024034c85005fa025003cf1601cf16ccccc9ed54e037238210cb862902ba8e22335142c705f2e049c85003cf16c9134440c85005fa025003cf1601cf16ccccc9ed54e0360e00505b2082102508d66aba9f3002c705f2e049d4d4d101ed54fb04e06c318210d372158cbadc840ff2f0001da23864658380e78b64814183fa0bc002012011120025bd9adf6a2687d007d207d206a6a6888122f824020271131400adadbcf6a2687d007d207d206a6a688a2f827c1400914005eb90eb8583aa90382a10098a642801fd0100e78b00e78b64913c38e4658065826580097a007a00658064c27b80fc8000d8383a6465816503896583e5fbe4e84000cfaf16f6a2687d007d207d206a6a68bf99e836c1783872ebdb514d9c97c283b7f0ae5179029e2b6119c39462719e4f46ed8f7413e62c780a417877407e978f01a40711411b1acb773a96bdd93fa83bb5ca8435013c8c4b3ac91f4589cc780a38646583fa0064a18040fa0d3a2f';

const BONDING_WALLET_CODE_HEX = 'b5ee9c7241020d0100038a000114ff00f4a413f4bcf2c80b01020162020c02f4d001d0d3030171b0c0018e43135f038020d721ed44d0fa00fa40fa40d103d31f01840f218210178d4519ba0282107bdd97deba12b1f2f48040d721fa003012a002c85003fa0201cf1601cf16c9ed54e0fa40fa4031fa0031f401fa0031fa00013170f83a02d31f012082100f8a7ea5ba8e85303459db3ce03322030601f403d33f0101fa00fa4021fa4430c000f2e14ded44d0fa00fa40fa40d15219c705f2e0495114a120c2fff2af23800bd721d70b07f82a5425907054201314c85003fa0201cf1601cf16c9227871c8cb00cb04cb0012f400f400cb00c9514484f701f90001b07074c8cb02ca0712cb07cbf7c9d003fa40f401fa002004019620d70b009ad74bc00101c001b0f2b19130e2c88210178d451901cb1f500901cb3f5007fa0223cf1601cf1625fa025006cf16c9c8801801cb055003cf1670fa025a775003cb6bccccc944460500b02191729171e2f839206e9381239b9120e2216e94318128309101e25023a813a07381032c70f83ca00270f83612a00170f836a07381040282100966018070f837a0bcf2b0038050fb0001c85003fa0201cf1601cf16c9ed54025a8210178d4519ba8e84325adb3ce034218210595f07bcba8e843101db3ce0135f038210d372158cbadc840ff2f0070a02f4ed44d0fa00fa40fa40d106d33f0101fa00fa40fa4053a9c705b38e4ef82a5463c022800bd721d70b0755207054201314c85003fa0201cf1601cf16c9227871c8cb00cb04cb0012f400f400cb00c984f701f90001b07074c8cb02ca0712cb07cbf7c9d0500ac705f2e04a9139e25152a008fa0021925f04e30d2208090060c882107362d09c01cb1f2501cb3f5004fa0258cf1658cf16c9c8801001cb0524cf1658fa02017158cb6accc98011fb0000aed70b01c000b38e3b5043a1f82fa07381040282100966018070f837b60972fb02c8801001cb0501cf1670fa027001cb6a8210d53276db01cb1f0101cb3fc9810082fb0093145f04e258c85003fa0201cf1601cf16c9ed5401eeed44d0fa00fa40fa40d105d33f0101fa00fa40f401d15141a15237c705f2e04925c2fff2afc882107bdd97de01cb1f5801cb3f01fa0221cf1658cf16c9c8801801cb0525cf1670fa02017158cb6accc902f839206e943081160dde718102f270f8380170f836a0811bdf70f836a0bcf2b0018050fb00580b001cc85003fa0201cf1601cf16c9ed54001da0f605da89a1f401f481f481a3f055d51d4010';

function hexToCell(hex: string): Cell {
  return Cell.fromBoc(Buffer.from(hex, 'hex'))[0];
}

// Lazy loading for SSR
let _curveCode: Cell | null = null;
let _walletCode: Cell | null = null;

function getCurveCode(): Cell {
  if (!_curveCode) {
    _curveCode = hexToCell(BONDING_CURVE_CODE_HEX);
  }
  return _curveCode;
}

function getWalletCode(): Cell {
  if (!_walletCode) {
    _walletCode = hexToCell(BONDING_WALLET_CODE_HEX);
  }
  return _walletCode;
}

interface CookPadTokenData {
  name: string;
  symbol: string;
  description: string;
  image: string;
}

type DeployStep = 'idle' | 'deploying' | 'completed' | 'error';

export default function CookPad() {
  const { connected, wallet, sendTransaction, sendMultipleMessages } = useTonConnect();
  const [step, setStep] = useState<DeployStep>('idle');
  const [deployedAddress, setDeployedAddress] = useState('');
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<CookPadTokenData>({
    name: '',
    symbol: '',
    description: '',
    image: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDeploy = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!formData.name || !formData.symbol) {
      toast.error('Please fill in token name and symbol');
      return;
    }

    try {
      setStep('deploying');
      setError('');
      toast.loading('Preparing CookPad token...', { id: 'cookpad-deploy' });

      // Build on-chain metadata
      const contentCell = buildTokenMetadataCell({
        name: formData.name,
        symbol: formData.symbol.toUpperCase(),
        description: formData.description || `${formData.name} - Created on CookPad`,
        image: formData.image || undefined,
        decimals: '9',
      });

      // Initial supply: 1 billion tokens
      const totalSupply = BigInt(1_000_000_000) * BigInt(10 ** 9);

      // Bonding curve data structure:
      // total_supply, virtual_ton_reserve, virtual_token_reserve, collected_ton, 
      // admin, target_ton, fee_percent, graduated, wallet_code, content
      const curveData = beginCell()
        .storeCoins(totalSupply)
        .storeCoins(toNano('30')) // 30 TON virtual liquidity
        .storeCoins(totalSupply) // All tokens in curve initially
        .storeCoins(0) // collected_ton starts at 0
        .storeAddress(wallet)
        .storeCoins(toNano(BONDING_CURVE_TARGET.toString())) // 300 TON target
        .storeUint(TRADE_FEE_PERCENT * 100, 16) // 1% = 100 basis points
        .storeUint(0, 1) // not graduated
        .storeRef(getWalletCode())
        .storeRef(contentCell)
        .endCell();

      const stateInit = {
        code: getCurveCode(),
        data: curveData,
      };

      const curveAddress = contractAddress(0, stateInit);
      console.log('Deploying CookPad token to:', curveAddress.toString());

      const stateInitCell = beginCell()
        .store(storeStateInit(stateInit))
        .endCell();

      toast.loading('Confirm transaction in wallet (2 TON)...', { id: 'cookpad-deploy' });

      // Deploy message
      const deployMessage = {
        address: curveAddress.toString(),
        amount: toNano('0.1').toString(),
        stateInit: stateInitCell.toBoc().toString('base64'),
      };

      // Monetization message
      const monetizationMessage = {
        address: MONETIZATION_WALLET,
        amount: COOKPAD_FEE.toString(),
      };

      let result;
      if (sendMultipleMessages) {
        result = await sendMultipleMessages([deployMessage, monetizationMessage]);
      } else {
        result = await sendTransaction({
          to: curveAddress.toString(),
          value: toNano('0.1').toString(),
          stateInit: stateInitCell.toBoc().toString('base64'),
        });
      }

      if (result) {
        setDeployedAddress(curveAddress.toString());
        setStep('completed');
        toast.success('CookPad token launched!', { id: 'cookpad-deploy' });
      } else {
        throw new Error('Transaction rejected');
      }
    } catch (err: any) {
      console.error('CookPad deploy error:', err);
      setError(err.message || 'Failed to deploy token');
      setStep('error');
      toast.error(err.message || 'Failed to deploy', { id: 'cookpad-deploy' });
    }
  };

  const handleReset = () => {
    setStep('idle');
    setDeployedAddress('');
    setError('');
    setFormData({ name: '', symbol: '', description: '', image: '' });
  };

  return (
    <>
      <Head>
        <title>CookPad | Memepad on TON</title>
        <meta name="description" content="Launch memecoins with bonding curve on TON. Fair launch, auto-liquidity on STON.fi." />
        <link rel="icon" href="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" />
      </Head>

      <Toaster position="top-right" />

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        {/* Background decorations - Purple/Pink gradients */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-purple-500/20 to-pink-500/15 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/20 to-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-[550px] h-[550px] bg-gradient-to-br from-orange-500/15 to-purple-400/20 rounded-full blur-3xl" />
        </div>

        <Header />

        <main className="flex-grow relative z-10 pt-24 pb-12 px-4">
          <div className="max-w-2xl mx-auto">
            {/* Hero */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></span>
                Beta
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                  CookPad
                </span>
              </h1>
              <p className="text-lg text-gray-600 max-w-xl mx-auto">
                Launch your memecoin with a fair bonding curve. 
                Auto-graduates to STON.fi DEX at 300 TON.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-200 text-center">
                <p className="text-2xl font-bold text-purple-600">2 TON</p>
                <p className="text-sm text-gray-500">Launch Fee</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-pink-200 text-center">
                <p className="text-2xl font-bold text-pink-600">1%</p>
                <p className="text-sm text-gray-500">Trade Fee</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-orange-200 text-center">
                <p className="text-2xl font-bold text-orange-600">300 TON</p>
                <p className="text-sm text-gray-500">DEX Target</p>
              </div>
            </div>

            {step === 'idle' || step === 'error' ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-xl border border-purple-100">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span className="text-2xl">🚀</span>
                  Launch Your Token
                </h2>

                <div className="space-y-5">
                  {/* Token Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token Name <span className="text-pink-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g., Cook Inu"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                    />
                  </div>

                  {/* Symbol */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Symbol <span className="text-pink-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="symbol"
                      value={formData.symbol}
                      onChange={handleChange}
                      placeholder="e.g., COOKINU"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none uppercase"
                      maxLength={10}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Tell us about your token..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none resize-none"
                    />
                  </div>

                  {/* Image URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image URL
                    </label>
                    <input
                      type="url"
                      name="image"
                      value={formData.image}
                      onChange={handleChange}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  )}

                  {/* How it works */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                    <h4 className="font-medium text-purple-800 mb-2">How it works:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>1️⃣ Deploy your token with a bonding curve</li>
                      <li>2️⃣ Users can buy/sell on the curve (1% fee)</li>
                      <li>3️⃣ At 300 TON, liquidity auto-migrates to STON.fi</li>
                      <li>4️⃣ Trade freely on the DEX!</li>
                    </ul>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleDeploy}
                    disabled={!connected || !formData.name || !formData.symbol}
                    className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white font-bold rounded-xl hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                  >
                    {!connected ? (
                      <>🔗 Connect Wallet</>
                    ) : (
                      <>🚀 Launch for 2 TON</>
                    )}
                  </button>
                </div>
              </div>
            ) : step === 'deploying' ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-100 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-purple-100 flex items-center justify-center animate-pulse">
                  <span className="text-3xl">🚀</span>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Launching Token...</h2>
                <p className="text-gray-600 mb-6">Please confirm the transaction in your wallet</p>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            ) : (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-green-200 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-4xl">🎉</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Token Launched!</h2>
                <p className="text-gray-600 mb-6">Your memecoin is now live on CookPad</p>

                {/* Contract Address */}
                <div className="p-4 bg-gray-50 rounded-xl mb-6">
                  <p className="text-sm text-gray-500 mb-2">Contract Address</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-purple-600 font-mono text-sm break-all">{deployedAddress}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(deployedAddress)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      📋
                    </button>
                  </div>
                </div>

                {/* Bonding Curve Info */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl mb-6 border border-purple-100">
                  <h4 className="font-medium text-purple-800 mb-2">Bonding Curve Active</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress:</span>
                    <span className="text-purple-600 font-medium">0 / 300 TON</span>
                  </div>
                  <div className="w-full h-2 bg-purple-100 rounded-full mt-2">
                    <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    When 300 TON is reached, liquidity graduates to STON.fi
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href={`https://tonviewer.com/${deployedAddress}`}
                    target="_blank"
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    View on Explorer 🔍
                  </Link>
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Launch Another 🚀
                  </button>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h4 className="font-medium text-yellow-800">Beta Warning</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    CookPad is in beta. Trade at your own risk. Bonding curves are experimental.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
