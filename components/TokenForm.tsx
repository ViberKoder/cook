import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

export interface TokenData {
  name: string;
  symbol: string;
  description: string;
  image: string; // URL to image
  imageData?: string; // Base64 encoded image data for on-chain storage
  decimals: number;
  totalSupply: string;
  mintable: boolean;
}

export interface TokenFormProps {
  onDeploy: (data: TokenData) => void;
  isConnected: boolean;
  error?: string;
  initialData?: TokenData;
  onDataChange?: (data: TokenData) => void;
}

export default function TokenForm({ onDeploy, isConnected, error, initialData, onDataChange }: TokenFormProps) {
  const [formData, setFormData] = useState<TokenData>(initialData || {
    name: '',
    symbol: '',
    description: '',
    image: '',
    imageData: '',
    decimals: 9,
    totalSupply: '1000000',
    mintable: true,
  });

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      // Only update if there are actual values to set
      if (initialData.name || initialData.symbol || initialData.description || initialData.image) {
        setFormData(prev => ({
          ...prev,
          ...initialData,
          // Preserve existing values if new ones are empty
          name: initialData.name || prev.name,
          symbol: initialData.symbol || prev.symbol,
          description: initialData.description || prev.description,
          image: initialData.image || prev.image,
        }));
        
        // Update image preview if image URL is provided
        if (initialData.image && !initialData.imageData) {
          setImagePreview(initialData.image);
        }
      }
    }
  }, [initialData]);

  const [imagePreview, setImagePreview] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [imageSource, setImageSource] = useState<'upload' | 'url'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let newData: TokenData;
    
    if (type === 'checkbox') {
      newData = {
        ...formData,
        [name]: (e.target as HTMLInputElement).checked,
      };
    } else if (name === 'decimals') {
      const num = parseInt(value) || 0;
      newData = {
        ...formData,
        [name]: Math.min(Math.max(num, 0), 18),
      };
    } else {
      newData = {
        ...formData,
        [name]: value,
      };
    }

    if (name === 'image' && value) {
      setImagePreview(value);
      newData.imageData = '';
    }

    setFormData(newData);
    if (onDataChange) {
      onDataChange(newData);
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
      
      const newData = {
        ...formData,
        imageData: base64Data,
        image: '',
      };
      setFormData(newData);
      setImagePreview(base64);
      if (onDataChange) {
        onDataChange(newData);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDeploy(formData);
  };

  const isValid = formData.name.trim() && formData.symbol.trim() && formData.totalSupply;

  const clearImage = () => {
    const newData = { ...formData, image: '', imageData: '' };
    setFormData(newData);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onDataChange) {
      onDataChange(newData);
    }
  };

  // Update image preview when image URL changes externally
  useEffect(() => {
    if (formData.image && !formData.imageData) {
      setImagePreview(formData.image);
    }
  }, [formData.image, formData.imageData]);

  return (
    <form onSubmit={handleSubmit} className="card">
      {/* Tabs */}
      <div className="flex space-x-2 mb-8 p-1 bg-cook-bg-secondary rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'basic'
              ? 'bg-gradient-cook text-white shadow-cook'
              : 'text-cook-text-secondary hover:text-cook-text'
          }`}
        >
          Basic Info
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('advanced')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'advanced'
              ? 'bg-gradient-cook text-white shadow-cook'
              : 'text-cook-text-secondary hover:text-cook-text'
          }`}
        >
          Advanced
        </button>
      </div>

      {activeTab === 'basic' ? (
        <div className="space-y-6">
          {/* Token Name & Symbol */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-cook-text mb-2">
                Token Name <span className="text-cook-orange">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., My Token"
                className="input-ton"
                required
              />
              <p className="text-xs text-cook-text-secondary mt-1">The full name of your token</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-cook-text mb-2">
                Symbol <span className="text-cook-orange">*</span>
              </label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                placeholder="e.g., MTK"
                className="input-ton uppercase"
                maxLength={10}
                required
              />
              <p className="text-xs text-cook-text-secondary mt-1">3-5 characters recommended</p>
            </div>
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
              className="input-ton min-h-[100px] resize-none"
              rows={3}
            />
          </div>

          {/* Image Upload/URL */}
          <div>
            <label className="block text-sm font-medium text-cook-text mb-2">
              Token Image
            </label>
            
            {/* Image Source Toggle */}
            <div className="flex gap-4 mb-4">
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

            <div className="flex gap-4">
              <div className="flex-grow">
                {imageSource === 'upload' ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="flex items-center justify-center w-full h-12 px-4 border-2 border-dashed border-cook-border rounded-xl cursor-pointer hover:border-cook-orange transition-colors bg-cook-bg-secondary"
                    >
                      <svg className="w-5 h-5 mr-2 text-cook-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-cook-text-secondary">Click to upload</span>
                    </label>
                    <p className="text-xs text-cook-text-secondary mt-1">PNG, JPEG, GIF, WEBP</p>
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      name="image"
                      value={formData.image}
                      onChange={handleChange}
                      placeholder="https://example.com/token-logo.png"
                      className="input-ton"
                    />
                    <p className="text-xs text-cook-text-secondary mt-1">Direct link to image file</p>
                  </div>
                )}
              </div>
              
              {/* Image Preview */}
              <div className="w-20 h-20 rounded-xl bg-cook-bg-secondary border border-cook-border overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                {imagePreview ? (
                  <>
                    <Image 
                      src={imagePreview} 
                      alt="Token preview" 
                      fill
                      className="object-cover"
                      onError={() => setImagePreview('')}
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <svg className="w-8 h-8 text-cook-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Total Supply */}
          <div>
            <label className="block text-sm font-medium text-cook-text mb-2">
              Total Supply <span className="text-cook-orange">*</span>
            </label>
            <input
              type="text"
              name="totalSupply"
              value={formData.totalSupply}
              onChange={handleChange}
              placeholder="1000000"
              className="input-ton"
              required
            />
            <p className="text-xs text-cook-text-secondary mt-1">
              Total number of tokens to mint (without decimals)
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Decimals */}
          <div>
            <label className="block text-sm font-medium text-cook-text mb-2">
              Decimals
            </label>
            <input
              type="number"
              name="decimals"
              value={formData.decimals}
              onChange={handleChange}
              min={0}
              max={18}
              className="input-ton"
            />
            <p className="text-xs text-cook-text-secondary mt-1">
              Number of decimal places (9 is standard for TON tokens)
            </p>
          </div>

          {/* On-chain Metadata Info */}
          <div className="p-4 bg-cook-bg-secondary rounded-xl border border-cook-border">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">⛓️</span>
              <div>
                <h4 className="font-medium text-cook-text">On-chain Metadata</h4>
                <p className="text-sm text-cook-text-secondary">Fully decentralized, stored directly in the contract</p>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-700">
                ✅ Your token metadata (name, symbol, image, description) will be stored on-chain using TEP-64 standard.
                This ensures maximum decentralization and permanence.
              </p>
            </div>
          </div>

          {/* Mintable */}
          <div className="flex items-center justify-between p-4 bg-cook-bg-secondary rounded-xl border border-cook-border">
            <div>
              <h4 className="font-medium text-cook-text">Mintable</h4>
              <p className="text-sm text-cook-text-secondary">Allow minting additional tokens after deployment</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="mintable"
                checked={formData.mintable}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-cook-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-cook-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cook-orange"></div>
            </label>
          </div>

          {/* Info Card */}
          <div className="p-4 bg-ton-blue/10 border border-ton-blue/20 rounded-xl">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-ton-blue flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-medium text-ton-blue mb-1">Jetton 2.0 Standard</h4>
                <p className="text-sm text-cook-text-secondary">
                  Your token uses the official Jetton 2.0 contract from TON Core. 
                  Fully compatible with DeDust, STON.fi, and all wallets/explorers.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Summary & Submit */}
      <div className="mt-8 pt-6 border-t border-cook-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="text-cook-text-secondary text-sm">Deployment cost</p>
            <p className="text-2xl font-bold text-cook-text">1 TON</p>
            <p className="text-xs text-cook-text-secondary mt-1">0.2 TON deploy + 0.8 TON fee</p>
          </div>
          
          <button
            type="submit"
            disabled={!isConnected || !isValid}
            className="btn-cook w-full md:w-auto flex items-center justify-center gap-2 min-w-[200px] text-lg py-4"
          >
            {!isConnected ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Connect Wallet
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
                Cook Jetton
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
