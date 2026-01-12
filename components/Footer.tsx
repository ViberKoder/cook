import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-cook-border bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Image 
                src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
                alt="Cook" 
                width={40}
                height={40}
                loading="lazy"
              />
              <span className="text-xl font-bold gradient-text-cook">Cook</span>
            </div>
            <p className="text-cook-text-secondary text-sm max-w-md">
              Cook your own Jetton 2.0 tokens on The Open Network. 
              Built with the latest standards for security and compatibility.
            </p>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-cook-text font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="https://docs.ton.org" 
                  target="_blank"
                  className="text-cook-text-secondary hover:text-cook-orange transition-colors text-sm"
                >
                  TON Documentation
                </Link>
              </li>
              <li>
                <Link 
                  href="https://github.com/ton-blockchain/jetton-contract" 
                  target="_blank"
                  className="text-cook-text-secondary hover:text-cook-orange transition-colors text-sm"
                >
                  Jetton Contract
                </Link>
              </li>
              <li>
                <Link 
                  href="https://tonviewer.com" 
                  target="_blank"
                  className="text-cook-text-secondary hover:text-cook-orange transition-colors text-sm"
                >
                  TON Explorer
                </Link>
              </li>
              <li>
                <Link 
                  href="https://t.me/cookcm" 
                  target="_blank"
                  className="text-cook-text-secondary hover:text-cook-orange transition-colors text-sm"
                >
                  Cook Community
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-cook-text font-semibold mb-4">Community</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="https://t.me/cookcm" 
                  target="_blank"
                  className="text-cook-text-secondary hover:text-cook-orange transition-colors text-sm flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                  Telegram
                </Link>
              </li>
              <li>
                <Link 
                  href="https://twitter.com/ton_blockchain" 
                  target="_blank"
                  className="text-cook-text-secondary hover:text-cook-orange transition-colors text-sm flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Twitter
                </Link>
              </li>
              <li>
                <Link 
                  href="https://github.com/ton-blockchain" 
                  target="_blank"
                  className="text-cook-text-secondary hover:text-cook-orange transition-colors text-sm flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-cook-border flex flex-col md:flex-row justify-between items-center">
          <p className="text-cook-text-secondary text-sm">
            © 2026 Cook. Built on TON Blockchain.
          </p>
          <p className="text-cook-text-secondary text-sm mt-2 md:mt-0">
            Powered by{' '}
            <Link href="https://ton.org" target="_blank" className="text-ton-blue hover:text-cook-orange">
              The Open Network
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
