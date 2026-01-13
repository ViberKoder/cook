import { Address, beginCell, Cell, toNano } from '@ton/core';
import { SendTransactionParams } from '@/hooks/useTonConnect';
import { buildOnchainMetadataCell, Op } from './deploy';

export interface JettonInfo {
  totalSupply: string;
  adminAddress: string | null;
  mintable: boolean;
  name: string;
  symbol: string;
  description: string;
  image: string;
  decimals: number;
}

/**
 * Load jetton information from API
 */
export async function loadJettonInfo(contractAddress: string): Promise<JettonInfo> {
  try {
    const address = Address.parse(contractAddress);
    
    // Try TonAPI first
    const response = await fetch(`https://tonapi.io/v2/jettons/${address.toString()}`);
    
    if (response.ok) {
      const data = await response.json();
      return {
        totalSupply: data.total_supply || '0',
        adminAddress: data.admin?.address || null,
        mintable: data.mintable !== false,
        name: data.metadata?.name || '',
        symbol: data.metadata?.symbol || '',
        description: data.metadata?.description || '',
        image: data.metadata?.image || '',
        decimals: parseInt(data.metadata?.decimals || '9'),
      };
    }
    
    // Fallback to TonCenter
    const altResponse = await fetch(`https://toncenter.com/api/v3/jetton/masters?address=${address.toString()}&limit=1`);
    if (!altResponse.ok) {
      throw new Error('Token not found');
    }
    
    const altData = await altResponse.json();
    if (!altData.jetton_masters || altData.jetton_masters.length === 0) {
      throw new Error('Token not found');
    }
    
    const master = altData.jetton_masters[0];
    return {
      totalSupply: master.total_supply || '0',
      adminAddress: master.admin_address || null,
      mintable: master.mintable !== false,
      name: master.jetton_content?.name || '',
      symbol: master.jetton_content?.symbol || '',
      description: master.jetton_content?.description || '',
      image: master.jetton_content?.image || '',
      decimals: parseInt(master.jetton_content?.decimals || '9'),
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to load token info');
  }
}

/**
 * Build mint transaction body
 */
export function buildMintBody(
  toAddress: Address,
  amount: bigint,
  responseAddress: Address
): Cell {
  const internalTransferMsg = beginCell()
    .storeUint(Op.internal_transfer, 32)
    .storeUint(0, 64) // query_id
    .storeCoins(amount) // jetton_amount
    .storeAddress(null) // from_address
    .storeAddress(responseAddress) // response_address
    .storeCoins(toNano('0.01')) // forward_ton_amount
    .storeMaybeRef(null) // custom_payload
    .endCell();

  return beginCell()
    .storeUint(Op.mint, 32)
    .storeUint(0, 64) // query_id
    .storeAddress(toAddress) // to_address
    .storeCoins(toNano('0.1')) // amount for wallet deployment
    .storeRef(internalTransferMsg) // master_msg
    .endCell();
}

/**
 * Build change metadata transaction body
 */
export function buildChangeMetadataBody(metadataCell: Cell): Cell {
  return beginCell()
    .storeUint(4, 32) // change_content opcode (TEP-64)
    .storeUint(0, 64) // query_id
    .storeRef(metadataCell) // new_content
    .endCell();
}

/**
 * Build change admin transaction body
 */
export function buildChangeAdminBody(newAdmin: Address): Cell {
  return beginCell()
    .storeUint(Op.change_admin, 32)
    .storeUint(0, 64) // query_id
    .storeAddress(newAdmin)
    .endCell();
}

/**
 * Build drop admin transaction body (revoke admin rights)
 */
export function buildDropAdminBody(): Cell {
  return beginCell()
    .storeUint(Op.drop_admin, 32)
    .storeUint(0, 64) // query_id
    .endCell();
}

/**
 * Send mint transaction
 */
export async function sendMintTransaction(
  contractAddress: string,
  toAddress: string,
  amount: string,
  decimals: number,
  responseAddress: Address,
  sendTransaction: (params: SendTransactionParams) => Promise<any>
): Promise<void> {
  const to = Address.parse(toAddress);
  const amountWithDecimals = BigInt(amount) * BigInt(10 ** decimals);
  const mintBody = buildMintBody(to, amountWithDecimals, responseAddress);

  await sendTransaction({
    to: contractAddress,
    value: toNano('0.15').toString(),
    body: mintBody.toBoc().toString('base64'),
  });
}

/**
 * Send change metadata transaction
 */
export async function sendChangeMetadataTransaction(
  contractAddress: string,
  metadata: {
    name?: string;
    symbol?: string;
    description?: string;
    image?: string;
    decimals?: string;
  },
  sendTransaction: (params: SendTransactionParams) => Promise<any>
): Promise<void> {
  const metadataCell = buildOnchainMetadataCell({
    name: metadata.name || '',
    symbol: metadata.symbol || '',
    description: metadata.description,
    image: metadata.image,
    decimals: metadata.decimals || '9',
  });
  
  const changeMetadataBody = buildChangeMetadataBody(metadataCell);

  await sendTransaction({
    to: contractAddress,
    value: toNano('0.1').toString(),
    body: changeMetadataBody.toBoc().toString('base64'),
  });
}

/**
 * Send change admin transaction
 */
export async function sendChangeAdminTransaction(
  contractAddress: string,
  newAdminAddress: string,
  sendTransaction: (params: SendTransactionParams) => Promise<any>
): Promise<void> {
  const newAdmin = Address.parse(newAdminAddress);
  const changeAdminBody = buildChangeAdminBody(newAdmin);

  await sendTransaction({
    to: contractAddress,
    value: toNano('0.1').toString(),
    body: changeAdminBody.toBoc().toString('base64'),
  });
}

/**
 * Send drop admin transaction
 */
export async function sendDropAdminTransaction(
  contractAddress: string,
  sendTransaction: (params: SendTransactionParams) => Promise<any>
): Promise<void> {
  const dropAdminBody = buildDropAdminBody();

  await sendTransaction({
    to: contractAddress,
    value: toNano('0.05').toString(),
    body: dropAdminBody.toBoc().toString('base64'),
  });
}

/**
 * Send transaction to add token to Cooks (pay 0.2 TON fee)
 */
export async function sendAddToCooksTransaction(
  sendTransaction: (params: SendTransactionParams) => Promise<any>
): Promise<void> {
  const COOKS_FEE_WALLET = 'UQDjQOdWTP1bPpGpYExAsCcVLGPN_pzGvdno3aCk565ZnQIz';
  const COOKS_FEE = toNano('0.2');
  
  const address = Address.parse(COOKS_FEE_WALLET);
  
  await sendTransaction({
    to: address.toString(),
    value: COOKS_FEE.toString(),
    body: beginCell()
      .storeUint(0, 32) // op = 0 for simple transfer
      .storeUint(0, 64) // query_id
      .endCell()
      .toBoc()
      .toString('base64'),
  });
}

