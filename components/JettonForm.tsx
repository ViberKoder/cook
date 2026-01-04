'use client'

import { useState } from 'react'
import { useTonConnectUI, useTonWallet } from '@ton/connect-ui-react'
import { deployJetton2 } from '@/lib/jetton2'
import { Address } from '@ton/core'

export default function JettonForm() {
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic')
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    imageUrl: '',
    totalSupply: '1000000',
    decimals: '9',
    imageType: 'url' as 'url' | 'upload',
  })

  const [imageFile, setImageFile] = useState<File | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0])
    }
  }

  const handleDeploy = async () => {
    if (!wallet) {
      tonConnectUI.openModal()
      return
    }

    if (!formData.name || !formData.symbol || !formData.totalSupply) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const ownerAddress = Address.parse(wallet.account.address)
      const totalSupply = BigInt(formData.totalSupply) * BigInt(10 ** parseInt(formData.decimals))
      
      await deployJetton2({
        owner: ownerAddress,
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        imageUrl: formData.imageUrl,
        totalSupply,
        decimals: parseInt(formData.decimals),
        tonConnectUI,
      })

      alert('Jetton 2.0 deployed successfully!')
    } catch (error: any) {
      console.error('Deployment error:', error)
      alert(`Deployment failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-12">
      <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('basic')}
          className={`pb-4 px-4 font-semibold ${
            activeTab === 'basic'
              ? 'text-ton-blue border-b-2 border-ton-blue'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Basic Info
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={`pb-4 px-4 font-semibold ${
            activeTab === 'advanced'
              ? 'text-ton-blue border-b-2 border-ton-blue'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Advanced
        </button>
      </div>

      <div className="space-y-6">
        {activeTab === 'basic' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Token Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., My Token"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ton-blue focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  The full name of your token
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Symbol *
                </label>
                <input
                  type="text"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleInputChange}
                  placeholder="e.g., MTK"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ton-blue focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  3-5 characters recommended
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your token..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ton-blue focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Token Image
              </label>
              <div className="flex space-x-4 mb-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="imageType"
                    value="url"
                    checked={formData.imageType === 'url'}
                    onChange={() => setFormData(prev => ({ ...prev, imageType: 'url' }))}
                    className="text-ton-blue"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Image URL</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="imageType"
                    value="upload"
                    checked={formData.imageType === 'upload'}
                    onChange={() => setFormData(prev => ({ ...prev, imageType: 'upload' }))}
                    className="text-ton-blue"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Upload Image</span>
                </label>
              </div>
              {formData.imageType === 'url' ? (
                <div>
                  <input
                    type="url"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleInputChange}
                    placeholder="https://example.com/token-logo.png"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ton-blue focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Direct link to image file
                  </p>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ton-blue focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Supply *
              </label>
              <input
                type="text"
                name="totalSupply"
                value={formData.totalSupply}
                onChange={handleInputChange}
                placeholder="1000000"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ton-blue focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Total number of tokens to mint (without decimals)
              </p>
            </div>
          </>
        )}

        {activeTab === 'advanced' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Decimals
            </label>
            <input
              type="number"
              name="decimals"
              value={formData.decimals}
              onChange={handleInputChange}
              min="0"
              max="18"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ton-blue focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Number of decimal places (default: 9, same as TON)
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Deployment cost</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">1 TON</p>
          </div>
          <button
            onClick={handleDeploy}
            disabled={loading || !wallet}
            className="flex items-center space-x-2 px-6 py-3 bg-ton-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Deploying...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>{wallet ? 'Deploy Jetton 2.0' : 'Connect Wallet'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

