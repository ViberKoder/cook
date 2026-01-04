import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cook | Create Jetton 2.0 on TON',
  description: 'Deploy your own fungible token on The Open Network with the latest Jetton 2.0 standard.',
};

// TON Connect manifest URL
const manifestUrl = 'https://www.cook.tg/tonconnect-manifest.json';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TonConnectUIProvider manifestUrl={manifestUrl}>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 5000,
              style: {
                background: '#1A1A1A',
                color: '#FFFFFF',
                border: '1px solid #2A2A2A',
                borderRadius: '12px',
              },
              success: {
                iconTheme: {
                  primary: '#0088CC',
                  secondary: '#FFFFFF',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#FFFFFF',
                },
              },
            }}
          />
        </TonConnectUIProvider>
      </body>
    </html>
  );
}
