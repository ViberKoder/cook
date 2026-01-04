import { Address, beginCell, Cell, contractAddress, Dictionary, toNano, storeStateInit } from '@ton/core'
import { TonConnectUI } from '@tonconnect/ui-react'
import { sha256 } from '@ton/crypto'

// Jetton 2.0 Minter Contract Code
// Based on https://github.com/ton-blockchain/jetton-contract/tree/jetton-2.0
// Note: In production, you should compile the actual Jetton 2.0 contract from the repository
// Using lazy loading to avoid SSR issues with invalid placeholder data
let _minterCode: Cell | null = null
let _walletCode: Cell | null = null

function getMinterCode(): Cell {
  if (!_minterCode) {
    // Placeholder - replace with actual compiled contract code
    // For now, create an empty cell to avoid errors
    _minterCode = beginCell().endCell()
  }
  return _minterCode
}

function getWalletCode(): Cell {
  if (!_walletCode) {
    // Placeholder - replace with actual compiled contract code
    // For now, create an empty cell to avoid errors
    _walletCode = beginCell().endCell()
  }
  return _walletCode
}

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

// Helper to create snake format cell for long strings
function makeSnakeCell(data: Buffer): Cell {
  const CELL_MAX_SIZE_BYTES = 127
  const chunks: Buffer[] = []
  let remaining = data
  
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, CELL_MAX_SIZE_BYTES))
    remaining = remaining.slice(CELL_MAX_SIZE_BYTES)
  }
  
  // Build from the end
  let currentCell: Cell | null = null
  
  for (let i = chunks.length - 1; i >= 0; i--) {
    const builder = beginCell()
    
    if (i === 0) {
      builder.storeUint(0, 8) // snake prefix
    }
    
    builder.storeBuffer(chunks[i])
    
    if (currentCell) {
      builder.storeRef(currentCell)
    }
    
    currentCell = builder.endCell()
  }
  
  return currentCell || beginCell().storeUint(0, 8).endCell()
}

// Create onchain metadata cell for Jetton 2.0
// Jetton 2.0 uses onchain metadata stored in a dictionary (TEP-64)
// Format: dict<256, slice> where key is sha256(key_name), value is cell with data
async function createOnchainMetadata(params: {
  name: string
  symbol: string
  description: string
  imageUrl: string
  decimals: number
}): Promise<Cell> {
  // Create dictionary with proper serializers
  const metadataDict = Dictionary.empty(
    Dictionary.Keys.Buffer(32), // 32 bytes = 256 bits for SHA256 hash
    Dictionary.Values.Cell()
  )
  
  // Helper to create metadata key hash
  // Jetton 2.0 uses SHA256 of the key string
  const createKey = async (key: string): Promise<Buffer> => {
    const hash = await sha256(Buffer.from(key))
    return hash
  }
  
  // Helper to create metadata value cell in snake format
  const createValue = (value: string | number): Cell => {
    if (typeof value === 'string') {
      const valueBuffer = Buffer.from(value, 'utf-8')
      return makeSnakeCell(valueBuffer)
    } else {
      // For numbers, store as uint32 in snake format
      const valueBuffer = Buffer.allocUnsafe(4)
      valueBuffer.writeUInt32BE(value, 0)
      return makeSnakeCell(valueBuffer)
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
  
  // Return metadata cell with onchain prefix
  return beginCell()
    .storeUint(0, 8) // onchain content prefix
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
    .storeRef(getWalletCode()) // jetton_wallet_code
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
    code: getMinterCode(),
    data,
  })
}

// Deploy Jetton 2.0
export async function deployJetton2(params: JettonDeployParams): Promise<Address> {
  const minterData = await createMinterData(params)
  
  const stateInit = {
    code: getMinterCode(),
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

