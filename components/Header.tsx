'use client';

import { TonConnectButton } from '@tonconnect/ui-react';
import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 border-b border-cook-border">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-x-6 gap-y-2 max-lg:flex-wrap max-lg:pt-2 md:gap-x-8 h-16 max-lg:h-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 group flex-shrink-0">
          <Image 
            src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
            alt="Cook" 
            width={40}
            height={40}
            className="group-hover:scale-110 transition-transform max-lg:w-8 max-lg:h-8"
            priority
          />
          <span className="text-xl font-bold gradient-text-cook max-lg:text-lg">Cook</span>
        </Link>

        {/* Navigation */}
        <nav className="flex w-full items-center justify-center gap-1 max-lg:order-1 max-lg:w-full max-md:-mx-2 max-md:w-[calc(100%+16px)] max-md:overflow-x-auto max-md:scrollbar-hide lg:absolute lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:w-auto lg:gap-x-6 xl:gap-x-8">
          <Link 
            href="/"
            className="relative px-2 xl:px-[10px] py-[25px] max-lg:py-[14px] text-cook-text-secondary hover:text-cook-orange transition-colors text-sm font-medium whitespace-nowrap"
          >
            Jetton 2.0
          </Link>
          <Link 
            href="/cooks"
            className="relative px-2 xl:px-[10px] py-[25px] max-lg:py-[14px] text-cook-text-secondary hover:text-cook-orange transition-colors text-sm font-medium whitespace-nowrap"
          >
            Cooks
          </Link>
          <Link 
            href="/cookon"
            className="relative px-2 xl:px-[10px] py-[25px] max-lg:py-[14px] text-cook-text-secondary hover:text-cook-orange transition-colors text-sm font-medium whitespace-nowrap"
          >
            Cookon
          </Link>
          <Link 
            href="/admin"
            className="relative px-2 xl:px-[10px] py-[25px] max-lg:py-[14px] text-cook-text-secondary hover:text-cook-orange transition-colors text-sm font-medium whitespace-nowrap"
          >
            Admin
          </Link>
          <Link 
            href="https://tonviewer.com" 
            target="_blank"
            className="relative px-2 xl:px-[10px] py-[25px] max-lg:py-[14px] text-cook-text-secondary hover:text-cook-orange transition-colors text-sm font-medium whitespace-nowrap max-md:hidden"
          >
            Explorer
          </Link>
        </nav>

        {/* Wallet Connect Button */}
        <div className="flex gap-2 items-center flex-shrink-0">
          <TonConnectButton />
        </div>
      </section>
    </header>
  );
}
