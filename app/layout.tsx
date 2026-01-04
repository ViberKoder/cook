import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import TonConnectProvider from '@/components/TonConnectProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cook | Create Jetton 2.0 on TON',
  description: 'Deploy your own fungible token on The Open Network with the latest Jetton 2.0 standard.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TonConnectProvider>
          {children}
        </TonConnectProvider>
      </body>
    </html>
  );
}
