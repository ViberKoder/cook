import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { TonConnectProvider } from './providers/TonConnectProvider.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TonConnectProvider>
      <App />
    </TonConnectProvider>
  </React.StrictMode>,
)







