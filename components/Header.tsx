'use client'

import Link from 'next/link'
import { useTonConnectUI, useTonWallet } from '@ton/connect-ui-react'

export default function Header() {
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()

  const handleConnect = () => {
    tonConnectUI.openModal()
  }

  const handleDisconnect = () => {
    tonConnectUI.disconnect()
  }

  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">🍳</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">Cook</span>
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-ton-blue">
                Jetton 2.0
              </Link>
              <Link href="/admin" className="text-gray-700 dark:text-gray-300 hover:text-ton-blue">
                Admin
              </Link>
              <Link 
                href="https://tonviewer.com" 
                target="_blank"
                className="text-gray-700 dark:text-gray-300 hover:text-ton-blue"
              >
                Explorer
              </Link>
            </nav>
          </div>
          <button
            onClick={wallet ? handleDisconnect : handleConnect}
            className="flex items-center space-x-2 px-4 py-2 bg-ton-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span>🔗</span>
            <span>
              {wallet 
                ? `${wallet.account.address.slice(0, 4)}...${wallet.account.address.slice(-4)}`
                : 'Connect Wallet'}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}

