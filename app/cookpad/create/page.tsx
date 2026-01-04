'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTonConnect } from '@/hooks/useTonConnect';
import { deployCookpad } from '@/lib/deployCookpad';
import { buildOnchainMetadataCell, getJettonWalletCode } from '@/lib/deploy';
import { Address, toNano } from '@ton/core';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function CreateCookpadPage() {
  const { connected, wallet, sendTransaction } = useTonConnect();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    image: '',
    imageData: '',
    totalSupply: '1000000000', // 1B tokens default
    curveTon: '0.1', // Initial curve TON
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageSource, setImageSource] = useState<'upload' | 'url'>('url');
  const [deploying, setDeploying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'image' && value) {
      setImagePreview(value);
      setFormData(prev => ({ ...prev, imageData: '' }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024) {
      alert('Image too large. Maximum size is 100KB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      
      setFormData(prev => ({
        ...prev,
        imageData: base64Data,
        image: '',
      }));
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDeploy = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!formData.name.trim() || !formData.symbol.trim() || !formData.totalSupply) {
      toast.error('Please fill all required fields');
      return;
    }

    setDeploying(true);
    try {
      // Build metadata
      let imageUrl: string | undefined = formData.image;
      if (!imageUrl && formData.imageData) {
        imageUrl = `data:image/png;base64,${formData.imageData}`;
      }

      const contentCell = buildOnchainMetadataCell({
        name: formData.name,
        symbol: formData.symbol.toUpperCase(),
        description: formData.description || formData.name,
        image: imageUrl || undefined,
        decimals: '9',
      });

      // Get jetton wallet code
      const walletCode = await getJettonWalletCode();

      // Deploy cookpad
      const result = await deployCookpad(
        {
          content: contentCell,
          walletCode: walletCode,
          curveTon: formData.curveTon,
          author: wallet.toString(),
          totalSupply: formData.totalSupply, // 100% goes to bonding curve
        },
        wallet,
        sendTransaction
      );

      if (result.success && result.address) {
        toast.success('Cookpad deployed successfully!');
        // Redirect to cookpad page
        router.push(`/cookpad?contract=${result.address}`);
      } else {
        // Show detailed error message
        const errorMsg = result.error || 'Deployment failed';
        toast.error(errorMsg, { duration: 10000 });
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Cookpad deployment error:', error);
      toast.error(error.message || 'Failed to deploy Cookpad');
    } finally {
      setDeploying(false);
    }
  };

  const clearImage = () => {
    setFormData(prev => ({ ...prev, image: '', imageData: '' }));
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isValid = formData.name.trim() && formData.symbol.trim() && formData.totalSupply;

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
            href="/cookpad" 
            className="inline-flex items-center gap-2 text-cook-text-secondary hover:text-cook-orange mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Cookpad
          </Link>

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
            Create <span className="gradient-text-cook">Cookpad</span>
          </h1>
          <p className="text-cook-text-secondary text-center mb-8">
            Create a memepad with bonding curve. 100% of supply goes to bonding curve. After 300 TON, token goes to DEX.
          </p>

          {!connected ? (
            <div className="card text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-cook-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-xl font-semibold text-cook-text mb-2">Connect Wallet</h3>
              <p className="text-cook-text-secondary">Connect your wallet to create a Cookpad token</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleDeploy(); }} className="card space-y-6">
              {/* Token Name */}
              <div>
                <label className="block text-sm font-medium text-cook-text mb-2">
                  Token Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="My Awesome Token"
                  className="input-ton"
                  required
                />
              </div>

              {/* Token Symbol */}
              <div>
                <label className="block text-sm font-medium text-cook-text mb-2">
                  Token Symbol *
                </label>
                <input
                  type="text"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleChange}
                  placeholder="MAT"
                  className="input-ton"
                  maxLength={10}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-cook-text mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe your token..."
                  className="input-ton"
                  rows={3}
                />
              </div>

              {/* Total Supply */}
              <div>
                <label className="block text-sm font-medium text-cook-text mb-2">
                  Total Supply *
                </label>
                <input
                  type="text"
                  name="totalSupply"
                  value={formData.totalSupply}
                  onChange={handleChange}
                  placeholder="1000000000"
                  className="input-ton"
                  required
                />
                <p className="text-xs text-cook-text-secondary mt-1">
                  100% of this supply will go to bonding curve. After 300 TON liquidity is reached, token goes to DEX.
                </p>
              </div>

              {/* Initial Curve TON */}
              <div>
                <label className="block text-sm font-medium text-cook-text mb-2">
                  Initial Curve TON
                </label>
                <input
                  type="text"
                  name="curveTon"
                  value={formData.curveTon}
                  onChange={handleChange}
                  placeholder="0.1"
                  className="input-ton"
                />
                <p className="text-xs text-cook-text-secondary mt-1">
                  Initial TON amount for bonding curve calculation
                </p>
              </div>

              {/* Image Upload/URL */}
              <div>
                <label className="block text-sm font-medium text-cook-text mb-2">
                  Token Image
                </label>
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="imageSource"
                      checked={imageSource === 'url'}
                      onChange={() => setImageSource('url')}
                      className="mr-2 accent-cook-orange"
                    />
                    <span className="text-sm text-cook-text">Image URL</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="imageSource"
                      checked={imageSource === 'upload'}
                      onChange={() => setImageSource('upload')}
                      className="mr-2 accent-cook-orange"
                    />
                    <span className="text-sm text-cook-text">Upload Image</span>
                  </label>
                </div>

                {imageSource === 'upload' ? (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      ref={fileInputRef}
                      id="image-upload"
                      className="hidden"
                    />
                    <label
                      htmlFor="image-upload"
                      className="block w-full py-3 px-4 bg-cook-bg-secondary border border-cook-border rounded-xl cursor-pointer hover:border-cook-orange transition-colors text-center text-cook-text"
                    >
                      {imagePreview ? 'Change Image' : 'Choose Image (max 100KB)'}
                    </label>
                    {imagePreview && (
                      <div className="mt-4 relative">
                        <Image
                          src={imagePreview}
                          alt="Preview"
                          width={200}
                          height={200}
                          className="rounded-xl border border-cook-border"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={clearImage}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    name="image"
                    value={formData.image}
                    onChange={handleChange}
                    placeholder="https://example.com/image.png"
                    className="input-ton"
                  />
                )}
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <h4 className="font-semibold text-cook-text mb-2">How Cookpad Works</h4>
                <ul className="text-sm text-cook-text-secondary space-y-1">
                  <li>• 100% of supply goes to bonding curve</li>
                  <li>• Price increases as more tokens are bought</li>
                  <li>• 1% fee on each transaction</li>
                  <li>• After 300 TON liquidity, token automatically goes to STON.fi DEX</li>
                </ul>
              </div>

              {/* Deploy Button */}
              <button
                type="submit"
                disabled={!isValid || deploying || !connected}
                className="btn-cook w-full text-lg py-4"
              >
                {deploying ? (
                  <>
                    <div className="spinner mx-auto mb-2" />
                    Deploying Cookpad...
                  </>
                ) : (
                  'Deploy Cookpad'
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

