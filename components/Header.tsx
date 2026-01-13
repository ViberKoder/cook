'use client';

import { TonConnectButton } from '@tonconnect/ui-react';
import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 border-b border-cook-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-16">
          {/* Logo - higher on mobile */}
          <Link href="/" className="flex items-center space-x-2 group flex-shrink-0">
            <Image 
              src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
              alt="Cook" 
              width={40}
              height={40}
              className="group-hover:scale-110 transition-transform"
              priority
            />
            <span className="text-xl font-bold gradient-text-cook hidden sm:inline">Cook</span>
          </Link>

          {/* Navigation - responsive */}
          <nav className="flex items-center space-x-2 sm:space-x-3 md:space-x-6 lg:space-x-8 flex-1 justify-center md:justify-end">
            <Link 
              href="/"
              className="text-cook-text-secondary hover:text-cook-orange transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
            >
              Jetton 2.0
            </Link>
            <Link 
              href="/cooks"
              className="text-cook-text-secondary hover:text-cook-orange transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
            >
              Cooks
            </Link>
            <Link 
              href="/cookon"
              className="text-cook-text-secondary hover:text-cook-orange transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
            >
              Cookon
            </Link>
            <Link 
              href="/admin"
              className="text-cook-text-secondary hover:text-cook-orange transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
            >
              Admin
            </Link>
            <Link 
              href="https://tonviewer.com" 
              target="_blank"
              className="text-cook-text-secondary hover:text-cook-orange transition-colors text-xs sm:text-sm font-medium whitespace-nowrap hidden sm:inline"
            >
              Explorer
            </Link>
          </nav>

          {/* Wallet Connect Button */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            <TonConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
