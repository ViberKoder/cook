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

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
      const newData = {
        ...formData,
        image: '',
        imageData: result,
      };
      setFormData(newData);
      if (onDataChange) {
        onDataChange(newData);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
    };
    onDeploy(submitData);
  };

  const isValid = formData.name.trim() && formData.symbol.trim() && formData.totalSupply;

  const clearImage = () => {
    const newData = { ...formData, image: '', imageData: '' };
    setFormData(newData);
    setImagePreview('');
    if (onDataChange) {
      onDataChange(newData);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
          {/* Token Name */}
          <div>
            <label className="block text-sm font-medium text-cook-text mb-2">
              Token Name <span className="text-cook-orange">*</span>
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
              Symbol <span className="text-cook-orange">*</span>
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
            <p className="text-xs text-cook-text-secondary mt-1">
              Usually 3-5 characters, uppercase
            </p>
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
              placeholder="A brief description of your token..."
              rows={4}
              className="input-ton"
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-cook-text mb-2">
              Token Image
            </label>
            
            {/* Image Source Toggle */}
            <div className="flex space-x-2 mb-3">
              <button
                type="button"
                onClick={() => setImageSource('url')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  imageSource === 'url'
                    ? 'bg-cook-orange text-white'
                    : 'bg-cook-bg-secondary text-cook-text-secondary hover:text-cook-text'
                }`}
              >
                From URL
              </button>
              <button
                type="button"
                onClick={() => setImageSource('upload')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  imageSource === 'upload'
                    ? 'bg-cook-orange text-white'
                    : 'bg-cook-bg-secondary text-cook-text-secondary hover:text-cook-text'
                }`}
              >
                Upload
              </button>
            </div>

            {imageSource === 'url' ? (
              <input
                type="url"
                name="image"
                value={formData.image}
                onChange={handleChange}
                placeholder="https://example.com/token-image.png"
                className="input-ton"
              />
            ) : (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="block w-full py-3 px-4 border-2 border-dashed border-cook-border rounded-lg text-center cursor-pointer hover:border-cook-orange transition-colors"
                >
                  <span className="text-cook-text-secondary">Click to upload image</span>
                </label>
              </div>
            )}

            {imagePreview && (
              <div className="mt-4 relative inline-block">
                <Image
                  src={imagePreview}
                  alt="Token preview"
                  width={128}
                  height={128}
                  className="w-32 h-32 rounded-xl object-cover border-2 border-cook-border"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            )}

            <p className="text-xs text-cook-text-secondary mt-1">
              Recommended: 512x512px, PNG or JPG format
            </p>
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
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">⛓️</span>
                <h5 className="font-medium text-green-800">On-chain Metadata</h5>
              </div>
              <p className="text-xs text-green-700">
                Your token metadata (name, symbol, image, description) will be stored on-chain using TEP-64 standard.
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
              <div className="w-11 h-6 bg-cook-border rounded-full peer peer-checked:after:translate-x-full peer peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-cook-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cook-orange"></div>
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
                  Fully compatible with DeDust, STON.fi, and all TON wallets/explorers.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Summary & Submit */}
      <div className="mt-8 pt-6 border-t border-cook-border">
        <div className="bg-cook-bg-secondary rounded-xl p-4 mb-4">
          <h4 className="font-semibold text-cook-text mb-3">Token Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-cook-text-secondary">Name:</span>
              <span className="text-cook-text font-medium">{formData.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cook-text-secondary">Symbol:</span>
              <span className="text-cook-text font-medium">${formData.symbol || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cook-text-secondary">Supply:</span>
              <span className="text-cook-text font-medium">
                {formData.totalSupply ? Number(formData.totalSupply).toLocaleString() : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-cook-text-secondary">Decimals:</span>
              <span className="text-cook-text font-medium">{formData.decimals}</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!isConnected || !isValid}
          className="w-full cook-it-button hover:opacity-90 disabled:bg-white/20 disabled:cursor-not-allowed text-white disabled:text-white/60 font-medium py-3 px-6 rounded-xl transition-opacity"
        >
          {!isConnected ? 'Connect Wallet to Deploy' : 'Deploy Jetton 2.0'}
        </button>
      </div>
    </form>
  );
}
