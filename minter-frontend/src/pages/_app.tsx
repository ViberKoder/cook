import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { Toaster } from 'react-hot-toast';

// TON Connect manifest URL - dynamically use current origin
const manifestUrl = typeof window !== 'undefined' 
  ? `${window.location.origin}/tonconnect-manifest.json`
  : 'https://jetton-minter-viber-koders-projects.vercel.app/tonconnect-manifest.json';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <Component {...pageProps} />
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
  );
}
