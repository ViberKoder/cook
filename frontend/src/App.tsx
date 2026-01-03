import { useState, useEffect } from 'react'
import { TonConnectButton, useTonConnectUI, useTonAddress } from '@ton/connect-react'
import './App.css'
import DeployForm from './components/DeployForm'

function App() {
  const [tonConnectUI] = useTonConnectUI()
  const userFriendlyAddress = useTonAddress()
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    setIsConnected(!!userFriendlyAddress)
  }, [userFriendlyAddress])


  return (
    <div className="app">
      <header className="app-header">
        <div className="container">
          <h1 className="app-title">Cook</h1>
          <p className="app-subtitle">Jetton 2.0 Deployer</p>
          <div className="connect-button">
            <TonConnectButton />
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          {isConnected ? (
            <DeployForm userAddress={userFriendlyAddress!} />
          ) : (
            <div className="welcome-message">
              <h2>Welcome to Cook</h2>
              <p>Connect your TON wallet to deploy your Jetton 2.0 token</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
