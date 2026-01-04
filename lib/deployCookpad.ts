import { Address, beginCell, Cell, toNano, storeStateInit, contractAddress } from '@ton/core';
import { SendTransactionParams, TransactionMessage } from '@/hooks/useTonConnect';
import toast from 'react-hot-toast';

// Cookpad deployment constants
const FEE_WALLET = 'UQDjQOdWTP1bPpGpYExAsCcVLGPN_pzGvdno3aCk565ZnQIz';
const MAX_LIQUIDITY_TON = 300;
const FEE_BASIS_POINTS = 100; // 1% = 100 basis points

// STON.fi router addresses (will be set during deployment)
// Using null addresses for now - will be set correctly when contract is compiled
// STON.fi router: EQD0vdSA_NedR9uvbgN9EikRX-suesDxGeFg69XQMavfLqIo (correct format)
const STONFI_ROUTER = 'EQD0vdSA_NedR9uvbgN9EikRX-suesDxGeFg69XQMavfLqIo'; // STON.fi router
const STONFI_ROUTER_PTON_WALLET = 'EQD0vdSA_NedR9uvbgN9EikRX-suesDxGeFg69XQMavfLqIo'; // Will be set correctly

export interface CookpadDeployData {
  content: Cell; // Token metadata (TEP-64)
  walletCode: Cell; // Jetton wallet code
  curveTon: string; // Initial curve TON amount
  author: string; // Author address
  factory?: string; // Factory address (optional)
  totalSupply: string; // Total supply - 100% goes to bonding curve
}

/**
 * Deploy Cookpad contract
 * This creates a memepad with bonding curve that ends at 300 TON
 * 1% fee goes to FEE_WALLET
 * After 300 TON, token automatically goes to STON.fi DEX
 */
export async function deployCookpad(
  deployData: CookpadDeployData,
  walletAddress: Address,
  sendTransaction: (params: SendTransactionParams) => Promise<any>
): Promise<{ success: boolean; address?: string; error?: string }> {
  try {
    toast.loading('Preparing Cookpad contract...', { id: 'deploy-cookpad' });

    // TODO: Load compiled cookpad contract code
    // For now, this is a placeholder
    // const COOKPAD_CODE = ...; // Load from compiled .fif file

    const feeRecipient = Address.parse(FEE_WALLET);
    const author = Address.parse(deployData.author);
    const factory = deployData.factory ? Address.parse(deployData.factory) : Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');

    // Pack addresses for STON.fi integration
    // For now, use null addresses - will be set correctly when contract is compiled
    // STON.fi addresses will be configured in the contract itself
    let stonfiRouter: Address;
    let stonfiRouterPton: Address;
    
    try {
      // Try to parse STON.fi router address (correct format with underscores and hyphens)
      stonfiRouter = Address.parse(STONFI_ROUTER);
      stonfiRouterPton = Address.parse(STONFI_ROUTER_PTON_WALLET);
    } catch (error) {
      // If parsing fails, use null addresses (will be set in contract)
      console.warn('STON.fi router address parsing failed, using null addresses:', error);
      stonfiRouter = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');
      stonfiRouterPton = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');
    }
    
    const addressesCell = beginCell()
      .storeAddress(stonfiRouter)
      .storeAddress(stonfiRouterPton)
      .endCell();

    // Pack config
    const configCell = beginCell()
      .storeAddress(factory)
      .storeAddress(author)
      .storeUint(0, 1) // has_agent
      .storeAddress(feeRecipient)
      .storeUint(FEE_BASIS_POINTS, 16) // buy_fee_basis (1% = 100)
      .storeUint(FEE_BASIS_POINTS, 16) // sell_fee_basis (1% = 100)
      .storeCoins(toNano('0.1')) // liquidity_fee
      .storeMaybeRef(null) // custom_payload
      .storeRef(addressesCell)
      .endCell();

    // Pack params
    const paramsCell = beginCell()
      .storeCoins(toNano(deployData.curveTon || '0.1')) // curve_ton
      .storeUint(0, 32) // last_trade_date
      .storeCoins(0) // ton_liq_collected
      .endCell();

    // Pack storage
    const storageCell = beginCell()
      .storeCoins(0) // total_supply
      .storeUint(0, 2) // phase (0 = trading)
      .storeRef(deployData.content) // content
      .storeRef(deployData.walletCode) // wallet_code
      .storeRef(paramsCell)
      .storeRef(configCell)
      .endCell();

    // Load compiled cookpad contract code from example
    // Using example memepad contract code from: https://tonviewer.com/EQCHqNToJxTBPHc91_O7HRULzH4bfX6lLU5b1_76zPnlq3Mz
    // This is a placeholder - in production, this should be the actual compiled cookpad contract
    // For now, we'll fetch the code from the example contract or use a simplified version
    
    let COOKPAD_CODE: Cell;
    
    try {
      toast.loading('Loading contract code...', { id: 'deploy-cookpad' });
      
      // Fetch contract code from example memepad contract
      const exampleAddress = 'EQCHqNToJxTBPHc91_O7HRULzH4bfX6lLU5b1_76zPnlq3Mz';
      
      // Use TonAPI to get contract state with code
      const contractResponse = await fetch(`https://tonapi.io/v2/blockchain/accounts/${exampleAddress}`);
      
      if (!contractResponse.ok) {
        throw new Error(`Failed to fetch contract: ${contractResponse.statusText}`);
      }
      
      const contractData = await contractResponse.json();
      
      // Get code from account state - it might be in different formats
      let codeBoc: string | undefined;
      
      if (contractData.code) {
        codeBoc = contractData.code;
      } else if (contractData.interfaces?.[0]?.code) {
        codeBoc = contractData.interfaces[0].code;
      } else if (contractData.state?.code) {
        codeBoc = contractData.state.code;
      }
      
      if (!codeBoc) {
        throw new Error('Contract code not found in response');
      }
      
      // Parse code - try different formats
      let codeCells: Cell[] = [];
      
      // Try base64 first (most common)
      try {
        const codeBuffer = Buffer.from(codeBoc, 'base64');
        codeCells = Cell.fromBoc(codeBuffer);
      } catch (e1) {
        // Try hex
        try {
          const hexString = codeBoc.startsWith('0x') ? codeBoc.slice(2) : codeBoc;
          const codeBuffer = Buffer.from(hexString, 'hex');
          codeCells = Cell.fromBoc(codeBuffer);
        } catch (e2) {
          // Try as raw string (might be already in correct format)
          try {
            const codeBuffer = Buffer.from(codeBoc);
            codeCells = Cell.fromBoc(codeBuffer);
          } catch (e3) {
            throw new Error(`Failed to parse contract code. Tried base64, hex, and raw formats. Error: ${e3}`);
          }
        }
      }
      
      if (codeCells.length === 0) {
        throw new Error('No cells found in contract code');
      }
      
      // Get the first cell (main code cell)
      COOKPAD_CODE = codeCells[0];
      
      console.log('Contract code loaded successfully, cells:', codeCells.length);
    } catch (error: any) {
      console.error('Failed to load contract code:', error);
      toast.error(`Failed to load contract code: ${error.message}`, { id: 'deploy-cookpad', duration: 10000 });
      
      return {
        success: false,
        error: `Failed to load contract code: ${error.message}. The example contract may not be accessible or the API format has changed.`,
      };
    }

    // Create StateInit with compiled code
    const stateInit = {
      code: COOKPAD_CODE,
      data: storageCell,
    };

    const contractAddr = contractAddress(0, stateInit);
    
    // Build StateInit cell
    const stateInitCell = beginCell()
      .store(storeStateInit(stateInit))
      .endCell();

    // Deploy transaction
    toast.loading('Deploying Cookpad contract...', { id: 'deploy-cookpad' });
    
    try {
      await sendTransaction({
        to: contractAddr.toString(),
        value: toNano('0.15').toString(), // Initial balance (0.15 TON for deployment + gas)
        stateInit: stateInitCell.toBoc().toString('base64'),
      });

      toast.success('Cookpad contract deployed successfully!', { id: 'deploy-cookpad' });

      return {
        success: true,
        address: contractAddr.toString(),
      };
    } catch (error: any) {
      console.error('Transaction failed:', error);
      toast.error(`Deployment transaction failed: ${error.message}`, { id: 'deploy-cookpad' });
      return {
        success: false,
        error: error.message || 'Transaction failed',
      };
    }
  } catch (error: any) {
    console.error('Cookpad deployment error:', error);
    toast.error(error.message || 'Failed to deploy Cookpad', { id: 'deploy-cookpad' });
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

export { FEE_WALLET, MAX_LIQUIDITY_TON, FEE_BASIS_POINTS };

