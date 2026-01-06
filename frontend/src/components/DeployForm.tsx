import { useState } from 'react'
import { useTonConnectUI, useTonWallet } from '@ton/connect-react'
import { Address, beginCell, Cell, toNano } from '@ton/core'
import './DeployForm.css'

interface DeployFormProps {
  userAddress: string
}

function DeployForm({ userAddress }: DeployFormProps) {
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    decimals: '9',
    image: '',
  })

  const [isDeploying, setIsDeploying] = useState(false)
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const buildOnchainMetadata = (metadata: typeof formData): Cell => {
    const nameCell = beginCell().storeStringTail(metadata.name).endCell()
    const symbolCell = beginCell().storeStringTail(metadata.symbol).endCell()

    let metadataBuilder = beginCell()
    
    // Store name (key 0)
    metadataBuilder = metadataBuilder.storeRef(
      beginCell()
        .storeUint(0, 8)
        .storeRef(nameCell)
        .endCell()
    )
    
    // Store symbol (key 1)
    metadataBuilder = metadataBuilder.storeRef(
      beginCell()
        .storeUint(1, 8)
        .storeRef(symbolCell)
        .endCell()
    )

    if (metadata.description) {
      const descCell = beginCell().storeStringTail(metadata.description).endCell()
      metadataBuilder = metadataBuilder.storeRef(
        beginCell()
          .storeUint(2, 8)
          .storeRef(descCell)
          .endCell()
      )
    }

    if (metadata.decimals) {
      const decimalsCell = beginCell().storeStringTail(metadata.decimals).endCell()
      metadataBuilder = metadataBuilder.storeRef(
        beginCell()
          .storeUint(4, 8)
          .storeRef(decimalsCell)
          .endCell()
      )
    }

    if (metadata.image) {
      const imageCell = beginCell().storeStringTail(metadata.image).endCell()
      metadataBuilder = metadataBuilder.storeRef(
        beginCell()
          .storeUint(3, 8)
          .storeRef(imageCell)
          .endCell()
      )
    }

    return metadataBuilder.endCell()
  }

  const handleDeploy = async () => {
    if (!wallet || !tonConnectUI) {
      alert('Please connect your wallet')
      return
    }

    if (!formData.name || !formData.symbol) {
      alert('Please fill in name and symbol')
      return
    }

    setIsDeploying(true)

    try {
      const adminAddress = Address.parse(userAddress)
      const content = buildOnchainMetadata(formData)

      // Here you would deploy the contract
      // For now, we'll simulate the deployment
      const deployTransaction = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            address: 'EQD__________________________________________0vo', // Placeholder
            amount: toNano('0.1').toString(),
            payload: beginCell()
              .storeUint(0, 32) // deploy op
              .storeAddress(adminAddress)
              .storeRef(content)
              .endCell()
              .toBoc()
              .toString('base64'),
          },
        ],
      }

      const result = await tonConnectUI.sendTransaction(deployTransaction)
      
      if (result) {
        setDeployedAddress(result.boc)
        alert('Jetton deployed successfully!')
      }
    } catch (error) {
      console.error('Deployment error:', error)
      alert('Failed to deploy jetton. Please try again.')
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div className="deploy-form-container">
      <div className="deploy-form">
        <h2>Deploy Jetton 2.0</h2>
        <p className="form-description">
          Create your own Jetton 2.0 token with onchain metadata
        </p>

        <div className="form-group">
          <label htmlFor="name">Token Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="My Token"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="symbol">Token Symbol *</label>
          <input
            type="text"
            id="symbol"
            name="symbol"
            value={formData.symbol}
            onChange={handleInputChange}
            placeholder="MTK"
            required
            maxLength={10}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Token description"
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="decimals">Decimals</label>
          <input
            type="number"
            id="decimals"
            name="decimals"
            value={formData.decimals}
            onChange={handleInputChange}
            placeholder="9"
            min="0"
            max="18"
          />
        </div>

        <div className="form-group">
          <label htmlFor="image">Image URL (optional)</label>
          <input
            type="url"
            id="image"
            name="image"
            value={formData.image}
            onChange={handleInputChange}
            placeholder="https://example.com/image.png"
          />
        </div>

        <button
          className="deploy-button"
          onClick={handleDeploy}
          disabled={isDeploying || !formData.name || !formData.symbol}
        >
          {isDeploying ? 'Deploying...' : 'Deploy Jetton'}
        </button>

        {deployedAddress && (
          <div className="success-message">
            <p>✅ Jetton deployed successfully!</p>
            <p className="address">Address: {deployedAddress}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DeployForm





