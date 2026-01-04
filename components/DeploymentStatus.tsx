import Link from 'next/link';
import { useState } from 'react';
import { getStonfiPoolUrl } from '@/lib/deploy';

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

        {/* STON.fi Liquidity Pool Creation */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-2xl">🌊</span>
            <h3 className="font-bold text-cook-text">Create Liquidity Pool</h3>
          </div>
          <p className="text-sm text-cook-text-secondary mb-4">
            Add liquidity for your token on STON.fi DEX to enable trading
          </p>
          
          {!showStonfi ? (
            <button
              onClick={() => setShowStonfi(true)}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Pool on STON.fi
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
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
                  className="flex-1 py-2 px-4 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in New Tab
                </a>
                <button
                  onClick={() => setShowStonfi(false)}
                  className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
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
            <img 
              src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
              alt="" 
              className="w-5 h-5"
            />
            Cook Another
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 p-4 bg-orange-50 border border-orange-200 rounded-xl">
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
