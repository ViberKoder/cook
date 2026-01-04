'use client';

import { TonConnectButton } from '@tonconnect/ui-react';
import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-cook-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <Image 
              src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
              alt="Cook" 
              width={40}
              height={40}
              className="group-hover:scale-110 transition-transform"
              unoptimized
            />
            <span className="text-xl font-bold gradient-text-cook">Cook</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/"
              className="text-cook-text-secondary hover:text-cook-orange transition-colors text-sm font-medium"
            >
              Jetton 2.0
            </Link>
            <Link 
              href="/admin"
              className="text-cook-text-secondary hover:text-cook-orange transition-colors text-sm font-medium"
            >
              Admin
            </Link>
            <Link 
              href="https://tonviewer.com" 
              target="_blank"
              className="text-cook-text-secondary hover:text-cook-orange transition-colors text-sm font-medium"
            >
              Explorer
            </Link>
          </nav>

          {/* Wallet Connect Button */}
          <div className="flex items-center space-x-4">
            <TonConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
