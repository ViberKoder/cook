'use client';

import { useState } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TokenForm, { TokenData } from '@/components/TokenForm';
import DeploymentStatus, { DeploymentStep } from '@/components/DeploymentStatus';
import Features from '@/components/Features';
import { useTonConnect } from '@/hooks/useTonConnect';

export default function Home() {
  const { connected, wallet, sendTransaction, sendMultipleMessages } = useTonConnect();
  const [step, setStep] = useState<DeploymentStep>('idle');
  const [deployedAddress, setDeployedAddress] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleDeploy = async (tokenData: TokenData) => {
    if (!connected || !wallet) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setStep('preparing');
      setError('');
      
      const { deployJettonMinter } = await import('@/lib/deploy');
      
      setStep('deploying');
      
      const result = await deployJettonMinter(
        tokenData,
        wallet,
        sendTransaction,
        sendMultipleMessages
      );
      
      if (result.success && result.address) {
        setDeployedAddress(result.address);
        setStep('completed');
        
        // Save token to user's list
        if (wallet) {
          const { addUserToken, setTokenDeployedAt } = await import('@/lib/cookTokens');
          addUserToken(wallet.toString(), result.address);
          setTokenDeployedAt(result.address);
        }
      } else {
        throw new Error(result.error || 'Deployment failed');
      }
    } catch (err: any) {
      console.error('Deployment error:', err);
      setError(err.message || 'Failed to deploy token');
      setStep('error');
    }
  };

  const handleReset = () => {
    setStep('idle');
    setDeployedAddress('');
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col">
        {/* Background decorations - more saturated orange gradients */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-orange-500/30 to-yellow-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-400/25 to-amber-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-[550px] h-[550px] bg-gradient-to-br from-yellow-500/20 to-orange-400/25 rounded-full blur-3xl" />
        </div>

        <Header />

        <main className="flex-grow relative z-10">
          {/* Hero Section */}
          <section className="pt-24 pb-12 px-4">
            <div className="max-w-4xl mx-auto text-center">
              {/* Large Logo - 2.5x size */}
              <div className="mb-8">
                <Image 
                  src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
                  alt="Cook" 
                  width={240}
                  height={240}
                  className="mx-auto drop-shadow-2xl"
                  unoptimized
                />
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-cook-text">
                <span className="gradient-text-cook">Cook</span> your <span className="gradient-text-jetton">Jetton 2.0</span>
                <br />on TON
              </h1>
              
              <p className="text-lg md:text-xl text-cook-text-secondary max-w-2xl mx-auto mb-8">
                Deploy your own fungible token on The Open Network with the latest 
                Jetton 2.0 standard. Up to 3 times faster than Jetton 1.0.
              </p>

              {!connected && (
                <div className="inline-flex items-center px-6 py-3 bg-cook-bg-secondary rounded-xl border border-cook-border">
                  <svg className="w-5 h-5 mr-2 text-ton-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-cook-text-secondary">Connect your wallet to get started</span>
                </div>
              )}
            </div>
          </section>

          {/* Main Content */}
          <section className="py-12 px-4">
            <div className="max-w-4xl mx-auto">
              {step === 'idle' || step === 'error' ? (
                <TokenForm 
                  onDeploy={handleDeploy} 
                  isConnected={connected}
                  error={error}
                />
              ) : (
                <DeploymentStatus 
                  step={step}
                  deployedAddress={deployedAddress}
                  onReset={handleReset}
                />
              )}
            </div>
          </section>

          {/* Features Section */}
          <Features />
        </main>

        <Footer />
      </div>
  );
}
