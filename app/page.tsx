'use client'

import Header from '@/components/Header'
import JettonForm from '@/components/JettonForm'
import Features from '@/components/Features'
import Footer from '@/components/Footer'
import { TonConnectUIProvider } from '@tonconnect/ui-react'

export default function Home() {
  return (
    <TonConnectUIProvider manifestUrl="https://www.cook.tg/tonconnect-manifest.json">
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-ton-blue rounded-full flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">🍳</span>
                </div>
              </div>
              <h1 className="text-5xl font-bold mb-4">
                <span className="text-gray-900 dark:text-white">Cook your Jetton 2.0</span>
                <br />
                <span className="text-ton-blue">on TON</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mt-4">
                Deploy your own fungible token on The Open Network with the latest Jetton 2.0 standard. 
                Up to 3 times faster than Jetton 1.0.
              </p>
            </div>
            <JettonForm />
          </div>
          <Features />
        </main>
        <Footer />
      </div>
    </TonConnectUIProvider>
  )
}

