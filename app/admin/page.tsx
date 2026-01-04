'use client'

import { useState } from 'react'
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react'
import { Address } from '@ton/core'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function AdminPage() {
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()
  const [jettonAddress, setJettonAddress] = useState('')
  const [loading, setLoading] = useState(false)

  const handleMint = async () => {
    if (!wallet || !jettonAddress) {
      alert('Please connect wallet and enter jetton address')
      return
    }

    setLoading(true)
    try {
      // Mint tokens logic here
      alert('Mint functionality coming soon')
    } catch (error: any) {
      console.error('Mint error:', error)
      alert(`Mint failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
            Jetton Admin Panel
          </h1>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Jetton Contract Address
                </label>
                <input
                  type="text"
                  value={jettonAddress}
                  onChange={(e) => setJettonAddress(e.target.value)}
                  placeholder="EQD..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ton-blue focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleMint}
                  disabled={loading || !wallet || !jettonAddress}
                  className="w-full px-6 py-3 bg-ton-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Processing...' : 'Mint Tokens'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

