import { Address, beginCell, Cell, toNano, storeStateInit, contractAddress, Dictionary } from '@ton/core';
import { SendTransactionParams, TransactionMessage } from '@/hooks/useTonConnect';
import { sha256 } from '@noble/hashes/sha256';
import toast from 'react-hot-toast';

export interface TokenData {
  name: string;
  symbol: string;
  description: string;
  image: string;
  imageData?: string;
  decimals: number;
  totalSupply: string;
  mintable: boolean;
}

// Monetization wallet address
const MONETIZATION_WALLET = 'UQDjQOdWTP1bPpGpYExAsCcVLGPN_pzGvdno3aCk565ZnQIz';
const DEPLOY_FEE = toNano('0.2');
const MONETIZATION_FEE = toNano('0.8');
export const TOTAL_DEPLOY_COST = toNano('1');

// ============================================================================
// JETTON 2.0 CONTRACTS with ON-CHAIN Metadata Support
// Based on https://github.com/ton-blockchain/jetton-contract/tree/jetton-2.0
// Modified to store TEP-64 on-chain metadata directly (like minter-contract)
// Compiled using func-js v0.4.6
// ============================================================================

// Jetton Minter with on-chain metadata (Jetton 2.0 + TEP-64)
const JETTON_MINTER_CODE_BASE64 = 'te6ccgECEwEABG0AART/APSkE/S88sgLAQIBYgIDAvjQMtDTAwFxsMABjjswgCDXIdMfAYIQF41FGbqRMOGAQNch+gAw7UTQ+gD6QPpA1NTRUEWhQTTIUAX6AlADzxYBzxbMzMntVOD6QPpAMfoAMfQB+gAx+gABMXD4OgLTHwEB0z8BEu1E0PoA+kD6QNTU0SaCEGQrfQe64wI5BAUCASAPEAGWNTVRYccF8uBJBPpAIfpEMMAA8uFN+gDU0SDQ0x8BghAXjUUZuvLgSIBA1yH6APpAMfpAMfoAINcLAJrXS8ABAcABsPKxkTDiVEMbBgTmJYIQe92X3rrjAiWCECx2uXO6jss1XwM0AfpA0gABAdGVyCHPFsmRbeLIgBABywVQBM8WcPoCcAHLaoIQ0XNUAAHLH1AEAcs/I/pEMMAAlzFsEnABywHjDfQAyYBQ+wDgNCSCEGUB81S64wIkghD7iOEZugkKCwwBjiGRcpFx4vg5IG6TgSObkSDiIW6UMYEoMJEB4lAjqBOgc4EDLHD4PKACcPg2EqABcPg2oHOBBAKCEAlmAYBw+DegvPKwJVl/BwHqggiYloBw+wIkgAvXIdcLB/goRgVwVCATFMhQA/oCAc8WAc8WySJ4ccjLAMsEywAS9AD0AMsAyVEzhPcB+QABsHB0yMsCygcSywfL98nQyIAYAcsFAc8WWPoCA5d3UAPLa8zMljFxWMtqzOLJgBH7AFAFoEMUCAAiyFAF+gJQA88WAc8WzMzJ7VQB8jUF+gD6QPgoVBIHIoAL1yHXCwdVIHBUIBMUyFAD+gIBzxYBzxbJInhxyMsAywTLABL0APQAywDJhPcB+QABsHB0yMsCygcSywfL98nQUAjHBfLgShKhRBRQNshQBfoCUAPPFgHPFszMye1U+kDRINcLAcAAs5Fb4w0NAJL4KEQEIoAL1yHXCwdVIHBUIBMUyFAD+gIBzxYBzxbJInhxyMsAywTLABL0APQAywDJhPcB+QABsHB0yMsCygcSywfL98nQEs8WAEIwM1FCxwXy4EkC+kDRQAMEyFAF+gJQA88WAc8WzMzJ7VQB/o4gMTMD0VExxwXy4EmLAkA0yFAF+gJQA88WAc8WzMzJ7VTgJIIQdDHyIbqOIjAzUELHBfLgSQHRiwKLAkA0yFAF+gJQA88WAc8WzMzJ7VTgNyPABI4fM1FCxwXy4EkC1NETREDIUAX6AlADzxYBzxbMzMntVOA2WyCCECUI1moOAETIgBABywUBzxZw+gJwActqghDVMnbbAcsfAQHLP8mAQvsAAEC6nzACxwXy4EnU1NEB7VT7BOBsMYIQ03IVjLrchA/y8AAlvZrfaiaH0AfSB9IGpqaIgSL4JAICcRESAK2tvPaiaH0AfSB9IGpqaIovgnwUAJFABeuQ64WDqpA4KhAJimQoAf0BAOeLAOeLZJE8OORlgGWCZYAJegB6AGWAZMJ7gPyAANg4OmRlgWUDiWWD5fvk6EAAJa8W9qJofQB9IH0gampomT+qkEA=';

// Jetton Wallet (Jetton 2.0)
const JETTON_WALLET_CODE_BASE64 = 'te6ccgECDQEAA4oAART/APSkE/S88sgLAQIBYgIDAvTQAdDTAwFxsMABjkMTXwOAINch7UTQ+gD6QPpA0QPTHwGEDyGCEBeNRRm6AoIQe92X3roSsfL0gEDXIfoAMBKgAshQA/oCAc8WAc8Wye1U4PpA+kAx+gAx9AH6ADH6AAExcPg6AtMfASCCEA+KfqW6joUwNFnbPOAzIgQFAB2g9gXaiaH0AfSB9IGj8FUB9APTPwEB+gD6QCH6RDDAAPLhTe1E0PoA+kD6QNFSGccF8uBJURShIML/8q8jgAvXIdcLB/gqVCWQcFQgExTIUAP6AgHPFgHPFskieHHIywDLBMsAEvQA9ADLAMlRRIT3AfkAAbBwdMjLAsoHEssHy/fJ0AP6QPQB+gAgBgJaghAXjUUZuo6EMlrbPOA0IYIQWV8HvLqOhDEB2zzgE18DghDTchWMutyED/LwCAkBliDXCwCa10vAAQHAAbDysZEw4siCEBeNRRkByx9QCQHLP1AH+gIjzxYBzxYl+gJQBs8WyciAGAHLBVADzxZw+gJad1ADy2vMzMlERgcAsCGRcpFx4vg5IG6TgSObkSDiIW6UMYEoMJEB4lAjqBOgc4EDLHD4PKACcPg2EqABcPg2oHOBBAKCEAlmAYBw+DegvPKwA4BQ+wAByFAD+gIBzxYBzxbJ7VQC9O1E0PoA+kD6QNEG0z8BAfoA+kD6QFOpxwWzjk74KlRjwCKAC9ch1wsHVSBwVCATFMhQA/oCAc8WAc8WySJ4ccjLAMsEywAS9AD0AMsAyYT3AfkAAbBwdMjLAsoHEssHy/fJ0FAKxwXy4EqROeJRUqAI+gAhkl8E4w0iCgsB7u1E0PoA+kD6QNEF0z8BAfoA+kD0AdFRQaFSN8cF8uBJJcL/8q/IghB73ZfeAcsfWAHLPwH6AiHPFljPFsnIgBgBywUlzxZw+gIBcVjLaszJAvg5IG6UMIEWDd5xgQLycPg4AXD4NqCBG99w+DagvPKwAYBQ+wBYDABgyIIQc2LQnAHLHyUByz9QBPoCWM8WWM8WyciAEAHLBSTPFlj6AgFxWMtqzMmAEfsAAK7XCwHAALOOO1BDofgvoHOBBAKCEAlmAYBw+De2CXL7AsiAEAHLBQHPFnD6AnABy2qCENUydtsByx8BAcs/yYEAgvsAkxRfBOJYyFAD+gIBzxYBzxbJ7VQAHMhQA/oCAc8WAc8Wye1U';

// Operation codes (Jetton 2.0)
export const Op = {
  transfer: 0xf8a7ea5,
  internal_transfer: 0x178d4519,
  burn: 0x595f07bc,
  burn_notification: 0x7bdd97de,
  mint: 0x642b7d07,
  change_admin: 0x6501f354,
  claim_admin: 0xfb88e119,
  drop_admin: 0x7431f221,
  change_content: 4, // TEP-64 on-chain content change
  provide_wallet_address: 0x2c76b973,
  take_wallet_address: 0xd1735400,
  top_up: 0xd372158c,
  excesses: 0xd53276db,
};

// Parse base64 to Cell
function base64ToCell(base64: string): Cell {
  return Cell.fromBase64(base64);
}

const JETTON_MINTER_CODE = base64ToCell(JETTON_MINTER_CODE_BASE64);
const JETTON_WALLET_CODE = base64ToCell(JETTON_WALLET_CODE_BASE64);

interface DeployResult {
  success: boolean;
  address?: string;
  error?: string;
}

// ============================================================================
// TEP-64 On-chain Metadata Builder
// Based on https://github.com/ton-blockchain/minter-contract
// Format: 0x00 + Dictionary<SHA256(key), Cell(0x00 + snake_data)>
// ============================================================================

const ONCHAIN_CONTENT_PREFIX = 0x00;
const OFFCHAIN_CONTENT_PREFIX = 0x01;
const SNAKE_PREFIX = 0x00;

type JettonMetaDataKeys = 'name' | 'description' | 'image' | 'symbol' | 'decimals';

const jettonOnChainMetadataSpec: { [key in JettonMetaDataKeys]: 'utf8' | 'ascii' } = {
  name: 'utf8',
  description: 'utf8',
  image: 'ascii',
  symbol: 'utf8',
  decimals: 'utf8',
};

/**
 * Build TEP-64 on-chain metadata cell
 * Exactly matches minter-contract format
 */
export function buildOnchainMetadataCell(data: { [s: string]: string | undefined }): Cell {
  const dict = Dictionary.empty(Dictionary.Keys.Buffer(32), Dictionary.Values.Cell());

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    
    const encoding = jettonOnChainMetadataSpec[key as JettonMetaDataKeys];
    if (!encoding) return;

    // SHA256 hash of the key
    const keyHash = Buffer.from(sha256(key));
    
    // Encode value
    const valueBuffer = Buffer.from(value, encoding);
    
    // Build value cell with snake format (0x00 prefix + data)
    const CELL_MAX_SIZE_BYTES = 127;
    
    if (valueBuffer.length <= CELL_MAX_SIZE_BYTES - 1) {
      // Single cell
      const cell = beginCell()
        .storeUint(SNAKE_PREFIX, 8)
        .storeBuffer(valueBuffer)
        .endCell();
      dict.set(keyHash, cell);
    } else {
      // Multi-cell snake format
      let remaining = valueBuffer;
      let rootBuilder = beginCell().storeUint(SNAKE_PREFIX, 8);
      
      const firstChunkSize = CELL_MAX_SIZE_BYTES - 1;
      rootBuilder.storeBuffer(remaining.slice(0, firstChunkSize));
      remaining = remaining.slice(firstChunkSize);
      
      let tailCell: Cell | null = null;
      const chunks: Buffer[] = [];
      while (remaining.length > 0) {
        chunks.push(remaining.slice(0, CELL_MAX_SIZE_BYTES));
        remaining = remaining.slice(CELL_MAX_SIZE_BYTES);
      }
      
      for (let i = chunks.length - 1; i >= 0; i--) {
        const builder = beginCell().storeBuffer(chunks[i]);
        if (tailCell) {
          builder.storeRef(tailCell);
        }
        tailCell = builder.endCell();
      }
      
      if (tailCell) {
        rootBuilder.storeRef(tailCell);
      }
      
      dict.set(keyHash, rootBuilder.endCell());
    }
  });

  // Final cell: 0x00 prefix + dictionary
  return beginCell()
    .storeUint(ONCHAIN_CONTENT_PREFIX, 8)
    .storeDict(dict)
    .endCell();
}

/**
 * Build off-chain metadata cell (URL)
 */
export function buildOffchainMetadataCell(uri: string): Cell {
  return beginCell()
    .storeUint(OFFCHAIN_CONTENT_PREFIX, 8)
    .storeStringTail(uri)
    .endCell();
}

export async function deployJettonMinter(
  tokenData: TokenData,
  walletAddress: Address,
  sendTransaction: (params: SendTransactionParams) => Promise<any>,
  sendMultipleMessages?: (messages: TransactionMessage[]) => Promise<any>
): Promise<DeployResult> {
  try {
    console.log('=== RAW TOKEN DATA RECEIVED ===');
    console.log('tokenData:', tokenData);
    console.log('================================');

    if (!tokenData.name.trim() || !tokenData.symbol.trim()) {
      throw new Error('Token name and symbol cannot be empty.');
    }

    toast.loading('Preparing Jetton 2.0 contract...', { id: 'deploy' });

    let contentCell: Cell;

    // Build TEP-64 on-chain metadata
    console.log('Building on-chain metadata (TEP-64)...');
    
    // Handle image: use URL if provided, or create data URL from base64 if uploaded
    let imageUrl: string | undefined = tokenData.image;
    if (!imageUrl && tokenData.imageData) {
      // Create data URL from base64
      imageUrl = `data:image/png;base64,${tokenData.imageData}`;
      console.log('Using uploaded image as data URL');
    }
    
    contentCell = buildOnchainMetadataCell({
      name: tokenData.name,
      symbol: tokenData.symbol.toUpperCase(),
      description: tokenData.description || tokenData.name,
      image: imageUrl || undefined,
      decimals: tokenData.decimals.toString(),
    });

    console.log('=== PROCESSED METADATA ===');
    console.log('Content cell created:', {
      bits: contentCell.bits.length,
      refs: contentCell.refs.length,
      hash: contentCell.hash().toString('hex').substring(0, 16) + '...',
    });
    console.log('===========================');

    // Total supply with decimals
    const supplyWithDecimals = BigInt(tokenData.totalSupply) * BigInt(10 ** tokenData.decimals);

    // Jetton 2.0 data structure:
    // total_supply, admin_address, next_admin_address, wallet_code, content
    const minterData = beginCell()
      .storeCoins(0) // total_supply (will be updated after mint)
      .storeAddress(walletAddress) // admin_address
      .storeAddress(null) // next_admin_address
      .storeRef(JETTON_WALLET_CODE) // jetton_wallet_code
      .storeRef(contentCell) // content (TEP-64)
      .endCell();

    // Create StateInit
    const stateInit = {
      code: JETTON_MINTER_CODE,
      data: minterData,
    };

    // Calculate contract address
    const minterAddress = contractAddress(0, stateInit);
    
    console.log('=== DEPLOYMENT INFO ===');
    console.log('Token name:', tokenData.name);
    console.log('Token symbol:', tokenData.symbol);
    console.log('Wallet address:', walletAddress.toString());
    console.log('Contract address:', minterAddress.toString());
    console.log('======================');

    // Build StateInit cell
    const stateInitCell = beginCell()
      .store(storeStateInit(stateInit))
      .endCell();

    // Build mint message (Jetton 2.0 opcode)
    const internalTransferMsg = beginCell()
      .storeUint(Op.internal_transfer, 32)
      .storeUint(0, 64) // query_id
      .storeCoins(supplyWithDecimals) // jetton_amount
      .storeAddress(null) // from_address
      .storeAddress(walletAddress) // response_address
      .storeCoins(toNano('0.01')) // forward_ton_amount
      .storeMaybeRef(null) // custom_payload
      .endCell();

    const mintBody = beginCell()
      .storeUint(Op.mint, 32)
      .storeUint(0, 64) // query_id
      .storeAddress(walletAddress) // to_address
      .storeCoins(toNano('0.1')) // amount for wallet deployment
      .storeRef(internalTransferMsg) // master_msg
      .endCell();

    toast.loading('Confirm transaction in wallet (1 TON)...', { id: 'deploy' });

    const deployMessage: TransactionMessage = {
      address: minterAddress.toString(),
      amount: DEPLOY_FEE.toString(),
      stateInit: stateInitCell.toBoc().toString('base64'),
      payload: mintBody.toBoc().toString('base64'),
    };

    const monetizationMessage: TransactionMessage = {
      address: MONETIZATION_WALLET,
      amount: MONETIZATION_FEE.toString(),
    };

    let result;
    
    if (sendMultipleMessages) {
      result = await sendMultipleMessages([deployMessage, monetizationMessage]);
    } else {
      const deployParams: SendTransactionParams = {
        to: minterAddress.toString(),
        value: DEPLOY_FEE.toString(),
        stateInit: stateInitCell.toBoc().toString('base64'),
        body: mintBody.toBoc().toString('base64'),
      };
      result = await sendTransaction(deployParams);
      
      // Send monetization separately if deploy succeeded
      if (result) {
        await sendTransaction({
          to: MONETIZATION_WALLET,
          value: MONETIZATION_FEE.toString(),
        });
      }
    }
    
    if (result) {
      toast.success('Jetton 2.0 token created!', { id: 'deploy' });
      return { success: true, address: minterAddress.toString() };
    } else {
      throw new Error('Transaction rejected');
    }
  } catch (error: any) {
    console.error('Deployment failed:', error);
    toast.error(error.message || 'Failed to create token', { id: 'deploy' });
    return { success: false, error: error.message || 'Unknown error' };
  }
}

export function getJettonWalletAddress(
  ownerAddress: Address,
  minterAddress: Address
): Address {
  const walletData = beginCell()
    .storeCoins(0)
    .storeAddress(ownerAddress)
    .storeAddress(minterAddress)
    .endCell();

  return contractAddress(0, {
    code: JETTON_WALLET_CODE,
    data: walletData,
  });
}

// STON.fi pool creation URL
export function getStonfiPoolUrl(tokenAddress: string): string {
  // Normalize address format (ensure EQ format)
  const normalizedAddress = tokenAddress.replace(/^UQ/, 'EQ');
  return `https://app.ston.fi/liquidity/provide?type=Balanced&ft=TON&tt=${normalizedAddress}&pool=new`;
}

export { Op as JettonOpcodes };
export const JETTON_VERSION = '2.0';

/**
 * Get Jetton Wallet Code as Cell
 */
export async function getJettonWalletCode(): Promise<Cell> {
  return Cell.fromBase64(JETTON_WALLET_CODE_BASE64);
}
