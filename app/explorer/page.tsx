'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ExplorerPage() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!address.trim()) {
      setError('Please enter a contract address');
      return;
    }

    // Normalize address (remove UQ/EQ prefix if present, or add if missing)
    let normalizedAddress = address.trim();
    
    // Remove whitespace
    normalizedAddress = normalizedAddress.replace(/\s/g, '');
    
    // If address doesn't start with UQ or EQ, try to add EQ
    if (!normalizedAddress.match(/^(UQ|EQ)/i)) {
      normalizedAddress = 'EQ' + normalizedAddress;
    }
    
    // Convert UQ to EQ for consistency
    if (normalizedAddress.startsWith('UQ')) {
      normalizedAddress = 'EQ' + normalizedAddress.substring(2);
    }

    // Basic validation - TON addresses are typically 48 characters after EQ/UQ
    if (normalizedAddress.length < 48 || normalizedAddress.length > 48) {
      setError('Invalid contract address format');
      return;
    }

    // Navigate to the token page
    router.push(`/cooks/${normalizedAddress}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-cook-bg pt-16">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-cook-text mb-4">Explorer</h1>
            <p className="text-lg text-cook-text-secondary">
              Enter a contract address to view token information
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card">
            <div className="mb-6">
              <label htmlFor="address" className="block text-sm font-medium text-cook-text mb-2">
                Contract Address
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setError('');
                }}
                placeholder="EQ or UQ address..."
                className="input-ton w-full"
              />
              {error && (
                <p className="mt-2 text-sm text-red-500">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="btn-cook w-full"
            >
              View Token
            </button>
          </form>

          <div className="mt-8 card">
            <h2 className="text-xl font-bold text-cook-text mb-4">How to use</h2>
            <ul className="space-y-2 text-cook-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-cook-orange mt-1">•</span>
                <span>Enter a Jetton contract address (EQ or UQ format)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cook-orange mt-1">•</span>
                <span>View token details, holders, and market information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cook-orange mt-1">•</span>
                <span>Track price changes and liquidity</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
