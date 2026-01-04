import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { getStonfiPoolUrl } from '@/lib/deploy';
import { sendDropAdminTransaction } from '@/lib/admin';
import { useTonConnect } from '@/hooks/useTonConnect';
import toast from 'react-hot-toast';

export type DeploymentStep = 'idle' | 'preparing' | 'deploying' | 'minting' | 'completed' | 'error';

interface DeploymentStatusProps {
  step: DeploymentStep;
  deployedAddress: string;
  onReset: () => void;
}

const steps = [
  { id: 'preparing', label: 'Preparing', description: 'Building your token contract...' },
  { id: 'deploying', label: 'Deploying', description: 'Confirm transaction in your wallet...' },
  { id: 'minting', label: 'Minting', description: 'Creating initial token supply...' },
  { id: 'completed', label: 'Completed', description: 'Your token is ready!' },
];

export default function DeploymentStatus({ step, deployedAddress, onReset }: DeploymentStatusProps) {
  const currentStepIndex = steps.findIndex(s => s.id === step);
  const [showStonfi, setShowStonfi] = useState(false);
  const [revokingAdmin, setRevokingAdmin] = useState(false);
  const { connected, wallet, sendTransaction } = useTonConnect();

  const handleRevokeAdmin = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!confirm('Are you sure you want to revoke admin rights? This will make your token fully decentralized and IRREVERSIBLE!')) {
      return;
    }

    setRevokingAdmin(true);
    try {
      await sendDropAdminTransaction(deployedAddress, sendTransaction);
      toast.success('Admin rights revoked! Your token is now fully decentralized.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke admin rights');
    } finally {
      setRevokingAdmin(false);
    }
  };

  if (step === 'completed') {
    const stonfiUrl = getStonfiPoolUrl(deployedAddress);

    return (
      <div className="card text-center">
        {/* Success Animation */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-cook-text mb-2">Token Cooked Successfully!</h2>
        <p className="text-cook-text-secondary mb-8">Your Jetton 2.0 token is now deployed on TON with on-chain metadata.</p>

        {/* Contract Address */}
        <div className="p-4 bg-cook-bg-secondary rounded-xl mb-6">
          <p className="text-sm text-cook-text-secondary mb-2">Contract Address</p>
          <div className="flex items-center justify-center gap-2">
            <code className="text-cook-orange font-mono text-sm break-all">{deployedAddress}</code>
            <button
              onClick={() => navigator.clipboard.writeText(deployedAddress)}
              className="p-2 hover:bg-cook-border rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 text-cook-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Decentralize Token Option */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="font-bold text-cook-text">Make Token Decentralized</h3>
          </div>
          <p className="text-sm text-cook-text-secondary mb-4">
            Revoke admin rights to make your token fully decentralized. This action is <strong>IRREVERSIBLE</strong>.
          </p>
          <button
            onClick={handleRevokeAdmin}
            disabled={!connected || revokingAdmin}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {revokingAdmin ? (
              <>
                <div className="spinner" />
                Revoking...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Revoke Admin Rights
              </>
            )}
          </button>
        </div>

        {/* STON.fi Liquidity Pool Creation */}
        <div className="mb-6 p-4 rounded-xl border border-blue-400 shadow-lg relative overflow-hidden animate-gradient" style={{
          background: 'linear-gradient(-45deg, #3b82f6, #06b6d4, #2563eb, #0891b2)',
        }}>
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Image 
                src="https://ston.fi/images/tild3236-3266-4139-a562-376139323438__ston_logo_light.svg"
                alt="STON.fi"
                width={120}
                height={25}
                className="brightness-0 invert"
                unoptimized
              />
              <h3 className="font-bold text-white text-lg">Create Liquidity Pool</h3>
            </div>
            <p className="text-sm text-blue-50 mb-4">
              Add liquidity for your token on STON.fi DEX to enable trading
            </p>
            
            {!showStonfi ? (
              <button
                onClick={() => setShowStonfi(true)}
                className="w-full py-3 px-4 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/30 transition-all flex items-center justify-center gap-2 border border-white/30"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Pool on STON.fi
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
                  <iframe
                    src={stonfiUrl}
                    className="w-full h-[500px]"
                    title="STON.fi Pool Creation"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                </div>
                <div className="flex gap-2">
                  <a
                    href={stonfiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-4 bg-white/20 backdrop-blur-sm text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors flex items-center justify-center gap-2 border border-white/30"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open in New Tab
                  </a>
                  <button
                    onClick={() => setShowStonfi(false)}
                    className="py-2 px-4 bg-white/20 backdrop-blur-sm text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors border border-white/30"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
          <Link
            href={`/admin?address=${deployedAddress}`}
            className="btn-cook flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Token
          </Link>
          <Link
            href={`https://tonviewer.com/${deployedAddress}`}
            target="_blank"
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View on Explorer
          </Link>
          <button onClick={onReset} className="btn-secondary flex items-center justify-center gap-2">
            <Image 
              src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
              alt="" 
              width={20}
              height={20}
              unoptimized
            />
            Cook Another
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
          <div className="flex items-start gap-3 text-left">
            <svg className="w-5 h-5 text-cook-orange flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-cook-orange mb-1">Next Steps</h4>
              <ul className="text-sm text-cook-text-secondary space-y-1">
                <li>• Create a liquidity pool on STON.fi or DeDust</li>
                <li>• Share the contract address with your community</li>
                <li>• Token appears in wallets when received</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-2xl font-bold text-cook-text text-center mb-8">Cooking Your Token...</h2>

      {/* Progress Steps */}
      <div className="max-w-md mx-auto mb-8">
        {steps.slice(0, -1).map((s, index) => {
          const isActive = s.id === step;
          const isCompleted = currentStepIndex > index;

          return (
            <div key={s.id} className="flex items-start mb-6 last:mb-0">
              <div className="flex flex-col items-center mr-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-cook-orange text-white animate-pulse'
                      : 'bg-cook-bg-secondary text-cook-text-secondary'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="font-semibold">{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 2 && (
                  <div className={`w-0.5 h-12 mt-2 ${isCompleted ? 'bg-green-500' : 'bg-cook-border'}`} />
                )}
              </div>

              <div className="pt-2">
                <h3 className={`font-semibold ${isActive ? 'text-cook-text' : isCompleted ? 'text-green-500' : 'text-cook-text-secondary'}`}>
                  {s.label}
                </h3>
                <p className="text-sm text-cook-text-secondary">{s.description}</p>
                {isActive && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="spinner" />
                    <span className="text-sm text-cook-orange">Processing...</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <button onClick={onReset} className="text-cook-text-secondary hover:text-cook-text text-sm transition-colors">
          Cancel deployment
        </button>
      </div>
    </div>
  );
}
