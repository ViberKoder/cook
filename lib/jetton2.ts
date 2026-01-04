import { Address, beginCell, Cell, contractAddress, Dictionary, toNano, storeStateInit } from '@ton/core'
import { TonConnectUI } from '@tonconnect/ui-react'
import { sha256 } from '@ton/crypto'

// Jetton 2.0 Minter Contract Code
// Based on https://github.com/ton-blockchain/jetton-contract/tree/jetton-2.0
// Note: In production, you should compile the actual Jetton 2.0 contract from the repository
const JETTON_MINTER_CODE = Cell.fromBase64(
  'te6cckEBAQEAXwAAuv8AIN0gggFMl7qX6XctNxQ9kN4mabaUvSzgRvYC/pT4gghBwgBDXwBIgA=='
)

// Jetton Wallet Contract Code for Jetton 2.0
const JETTON_WALLET_CODE = Cell.fromBase64(
  'te6cckEBAQEAXwAAuv8AIN0gggFMl7qX6XctNxQ9kN4mabaUvSzgRvYC/pT4gghBwgBDXwBIgA=='
)

export interface JettonDeployParams {
  owner: Address
  name: string
  symbol: string
  description: string
  imageUrl: string
  totalSupply: bigint
  decimals: number
  tonConnectUI: TonConnectUI
}

// Create onchain metadata cell for Jetton 2.0
// Jetton 2.0 uses onchain metadata stored in a dictionary
// Format: dict<256, slice> where key is sha256(key_name), value is cell with data
async function createOnchainMetadata(params: {
  name: string
  symbol: string
  description: string
  imageUrl: string
  decimals: number
}): Promise<Cell> {
  // Create dictionary for metadata
  const metadataDict = Dictionary.empty<bigint, Cell>()
  
  // Helper to create metadata key hash
  // Jetton 2.0 uses SHA256 of the key string
  const createKey = async (key: string): Promise<bigint> => {
    // Hash the key string directly
    const hash = await sha256(Buffer.from(key))
    return BigInt('0x' + Buffer.from(hash).toString('hex'))
  }
  
  // Helper to create metadata value cell
  // For strings: use offchain format (tag 0 + string)
  // For numbers: use onchain format (tag 1 + uint256)
  const createValue = (value: string | number): Cell => {
    if (typeof value === 'string') {
      return beginCell()
        .storeUint(0, 8) // offchain tag (data stored as reference)
        .storeStringTail(value)
        .endCell()
    } else {
      return beginCell()
        .storeUint(1, 8) // onchain tag (data stored inline)
        .storeUint(value, 32) // decimals is uint32
        .endCell()
    }
  }
  
  // Add metadata entries
  if (params.name) {
    metadataDict.set(await createKey('name'), createValue(params.name))
  }
  if (params.symbol) {
    metadataDict.set(await createKey('symbol'), createValue(params.symbol))
  }
  if (params.description) {
    metadataDict.set(await createKey('description'), createValue(params.description))
  }
  if (params.imageUrl) {
    metadataDict.set(await createKey('image'), createValue(params.imageUrl))
  }
  metadataDict.set(await createKey('decimals'), createValue(params.decimals))
  
  // Return metadata cell
  return beginCell()
    .storeDict(metadataDict)
    .endCell()
}

// Create initial data cell for Jetton Minter
async function createMinterData(params: JettonDeployParams): Promise<Cell> {
  const metadata = await createOnchainMetadata({
    name: params.name,
    symbol: params.symbol,
    description: params.description,
    imageUrl: params.imageUrl,
    decimals: params.decimals,
  })
  
  return beginCell()
    .storeCoins(0) // total_supply
    .storeAddress(params.owner) // admin
    .storeRef(metadata) // onchain metadata
    .storeRef(JETTON_WALLET_CODE) // jetton_wallet_code
    .endCell()
}

// Calculate contract address
export async function getJettonMinterAddress(owner: Address, workchain: number = 0): Promise<Address> {
  const data = await createMinterData({
    owner,
    name: '',
    symbol: '',
    description: '',
    imageUrl: '',
    totalSupply: BigInt(0),
    decimals: 9,
    tonConnectUI: {} as TonConnectUI,
  })
  
  return contractAddress(workchain, {
    code: JETTON_MINTER_CODE,
    data,
  })
}

// Deploy Jetton 2.0
export async function deployJetton2(params: JettonDeployParams): Promise<Address> {
  const minterData = await createMinterData(params)
  
  const stateInit = {
    code: JETTON_MINTER_CODE,
    data: minterData,
  }
  
  const minterAddress = contractAddress(0, stateInit)
  
  // Create state init cell
  const stateInitCell = beginCell()
    .store(storeStateInit(stateInit))
    .endCell()
  
  // Create deployment message (mint operation)
  const deployMessage = beginCell()
    .storeUint(0x642b7d07, 32) // op::mint (Jetton 2.0)
    .storeUint(0, 64) // query_id
    .storeAddress(params.owner) // destination
    .storeCoins(toNano('0.1')) // forward_ton_amount
    .storeRef(beginCell()
      .storeUint(0x178d4519, 32) // internal_transfer
      .storeUint(0, 64) // query_id
      .storeCoins(params.totalSupply) // amount
      .storeAddress(null) // from
      .storeAddress(params.owner) // to
      .storeCoins(toNano('0.01')) // forward_ton_amount
      .storeMaybeRef(null) // forward_payload
      .endCell()
    )
    .endCell()
  
  // Send deployment transaction in TON Connect format
  const transaction = {
    validUntil: Math.floor(Date.now() / 1000) + 360,
    messages: [
      {
        address: minterAddress.toString(),
        amount: toNano('1').toString(), // 1 TON for deployment
        stateInit: stateInitCell.toBoc().toString('base64'),
        payload: deployMessage.toBoc().toString('base64'),
      },
    ],
  }
  
  await params.tonConnectUI.sendTransaction(transaction)
  
  return minterAddress
}

