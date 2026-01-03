import { TonConnectUIProvider } from '@ton/connect-react'
import { ReactNode } from 'react'

interface TonConnectProviderProps {
  children: ReactNode
}

export function TonConnectProvider({ children }: TonConnectProviderProps) {
  return (
    <TonConnectUIProvider
      manifestUrl="https://www.cook.tg/tonconnect-manifest.json"
      actionsConfiguration={{
        twaReturnUrl: 'https://t.me/cook_bot',
      }}
    >
      {children}
    </TonConnectUIProvider>
  )
}

