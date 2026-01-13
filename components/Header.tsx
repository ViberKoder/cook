'use client';

import { TonConnectButton } from '@tonconnect/ui-react';
import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 border-b border-cook-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop: Single row layout */}
        <div className="hidden lg:flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group flex-shrink-0">
            <Image 
              src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
              alt="Cook" 
              width={40}
              height={40}
              className="group-hover:scale-110 transition-transform"
              priority
            />
            <span className="text-xl font-bold gradient-text-cook">Cook</span>
          </Link>

          {/* Navigation - centered on desktop */}
          <nav className="flex items-center space-x-6 lg:space-x-8 absolute left-1/2 transform -translate-x-1/2">
            <Link 
              href="/"
              className="text-cook-text-secondary hover:text-cook-orange transition-colors text-sm font-medium whitespace-nowrap"
            >
              Jetton 2.0
            </Link>
            <Link 
              href="/cooks"
              className="text-cook-text-secondary hover:text-cook-orange transition-colors text-sm font-medium whitespace-nowrap"
            >
              Cooks
            </Link>
            <Link 
              href="/cookon"
              className="text-cook-text-secondary hover:text-cook-orange transition-colors text-sm font-medium whitespace-nowrap"
            >
              Cookon
            </Link>
            <Link 
              href="/admin"
              className="text-cook-text-secondary hover:text-cook-orange transition-colors text-sm font-medium whitespace-nowrap"
            >
              Admin
            </Link>
            <Link 
              href="https://tonviewer.com" 
              target="_blank"
              className="text-cook-text-secondary hover:text-cook-orange transition-colors text-sm font-medium whitespace-nowrap"
            >
              Explorer
            </Link>
          </nav>

          {/* Wallet Connect Button */}
          <div className="flex items-center flex-shrink-0">
            <TonConnectButton />
          </div>
        </div>

        {/* Mobile/Tablet: Two-row layout */}
        <div className="lg:hidden">
          {/* First row: Logo left, Wallet right */}
          <div className="flex items-center justify-between h-14 w-full px-0">
            <Link href="/" className="flex items-center space-x-2 group flex-shrink-0">
              <Image 
                src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
                alt="Cook" 
                width={32}
                height={32}
                className="group-hover:scale-110 transition-transform"
                priority
              />
              <span className="text-lg font-bold gradient-text-cook">Cook</span>
            </Link>
            <div className="flex items-center justify-end flex-shrink-0 relative z-10" style={{ minWidth: '120px' }}>
              <TonConnectButton className="tc-wallet-button" />
            </div>
          </div>
          
          {/* Second row: Navigation centered */}
          <nav className="flex items-center justify-center space-x-4 h-12 border-t border-cook-border overflow-x-auto scrollbar-hide">
            <Link 
              href="/"
              className="text-cook-text-secondary hover:text-cook-orange transition-colors text-xs font-medium whitespace-nowrap px-2"
            >
              Jetton 2.0
            </Link>
            <Link 
              href="/cooks"
              className="text-cook-text-secondary hover:text-cook-orange transition-colors text-xs font-medium whitespace-nowrap px-2"
            >
              Cooks
            </Link>
            <Link 
              href="/cookon"
              className="text-cook-text-secondary hover:text-cook-orange transition-colors text-xs font-medium whitespace-nowrap px-2"
            >
              Cookon
            </Link>
            <Link 
              href="/admin"
              className="text-cook-text-secondary hover:text-cook-orange transition-colors text-xs font-medium whitespace-nowrap px-2"
            >
              Admin
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
