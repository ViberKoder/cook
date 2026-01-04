import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">🍳</span>
              <span className="text-xl font-bold text-white">Cook</span>
            </div>
            <p className="text-sm">
              Cook your own Jetton 2.0 tokens on The Open Network. Built with the latest standards for security and compatibility.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="https://docs.ton.org" target="_blank" className="hover:text-white">
                  TON Documentation
                </Link>
              </li>
              <li>
                <Link href="https://github.com/ton-blockchain/jetton-contract" target="_blank" className="hover:text-white">
                  Jetton Contract
                </Link>
              </li>
              <li>
                <Link href="https://tonviewer.com" target="_blank" className="hover:text-white">
                  TON Explorer
                </Link>
              </li>
              <li>
                <Link href="https://t.me/cookcm" target="_blank" className="hover:text-white">
                  Cook Community
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Community</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="https://t.me/cookcm" target="_blank" className="hover:text-white flex items-center space-x-2">
                  <span>📱</span>
                  <span>Telegram</span>
                </Link>
              </li>
              <li>
                <Link href="https://twitter.com/ton_blockchain" target="_blank" className="hover:text-white flex items-center space-x-2">
                  <span>🐦</span>
                  <span>Twitter</span>
                </Link>
              </li>
              <li>
                <Link href="https://github.com/ton-blockchain" target="_blank" className="hover:text-white flex items-center space-x-2">
                  <span>💻</span>
                  <span>GitHub</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm">© 2026 Cook. Built on TON Blockchain.</p>
          <p className="text-sm mt-2 md:mt-0">
            Powered by{' '}
            <Link href="https://ton.org" target="_blank" className="hover:text-white">
              The Open Network
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}

