import { Address, beginCell, Cell, toNano, storeStateInit, contractAddress } from '@ton/core';
import { SendTransactionParams, TransactionMessage } from '@/hooks/useTonConnect';
import { buildTokenMetadataCell, JettonMetadata } from './onchain-metadata';
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
// JETTON 2.0 CONTRACTS
// Based on https://github.com/ton-blockchain/jetton-contract/tree/jetton-2.0
// ============================================================================

// Official Jetton 2.0 Minter from jetton-contract repo
const JETTON_MINTER_CODE_HEX = 'b5ee9c72410215010004e0000114ff00f4a413f4bcf2c80b0102016202100202cb030f02f7d0cb434c0c05c6c3000638ecc200835c874c7c0608405e351466ea44c38601035c87e800c3b51343e803e903e90353534541168504d3214017e809400f3c58073c5b333327b55383e903e900c7e800c7d007e800c7e80004c5c3e0e80b4c7c04074cfc044bb51343e803e903e9035353449a084190adf41eeb8c08e60408019635355161c705f2e04904fa4021fa4430c000f2e14dfa00d4d120d0d31f018210178d4519baf2e0488040d721fa00fa4031fa4031fa0020d70b009ad74bc00101c001b0f2b19130e254431b05018e2191729171e2f839206e9381239b9120e2216e94318128309101e25023a813a07381032c70f83ca00270f83612a00170f836a07381040282100966018070f837a0bcf2b025597f0601ea820898968070fb0224800bd721d70b07f82846057054201314c85003fa0201cf1601cf16c9227871c8cb00cb04cb0012f400f400cb00c9513384f701f90001b07074c8cb02ca0712cb07cbf7c9d0c8801801cb0501cf1658fa020397775003cb6bcccc96317158cb6acce2c98011fb005005a04314070022c85005fa025003cf1601cf16ccccc9ed5404e62582107bdd97debae3022582102c76b973ba8ecb355f033401fa40d2000101d195c821cf16c9916de2c8801001cb055004cf1670fa027001cb6a8210d173540001cb1f500401cb3f23fa4430c00097316c127001cb01e30df400c98050fb00e0342482106501f354bae302248210fb88e119ba090b0c0d01f23505fa00fa40f82854120722800bd721d70b0755207054201314c85003fa0201cf1601cf16c9227871c8cb00cb04cb0012f400f400cb00c984f701f90001b07074c8cb02ca0712cb07cbf7c9d05008c705f2e04a12a144145036c85005fa025003cf1601cf16ccccc9ed54fa40d120d70b01c000b3915be30d0a0044c8801001cb0501cf1670fa027001cb6a8210d53276db01cb1f0101cb3fc98042fb000092f828440422800bd721d70b0755207054201314c85003fa0201cf1601cf16c9227871c8cb00cb04cb0012f400f400cb00c984f701f90001b07074c8cb02ca0712cb07cbf7c9d012cf16004230335142c705f2e04902fa40d1400304c85005fa025003cf1601cf16ccccc9ed5401fe8e20313303d15131c705f2e0498b024034c85005fa025003cf1601cf16ccccc9ed54e02482107431f221ba8e2230335042c705f2e04901d18b028b024034c85005fa025003cf1601cf16ccccc9ed54e037238210cb862902ba8e22335142c705f2e049c85003cf16c9134440c85005fa025003cf1601cf16ccccc9ed54e0360e00505b2082102508d66aba9f3002c705f2e049d4d4d101ed54fb04e06c318210d372158cbadc840ff2f0001da23864658380e78b64814183fa0bc002012011120025bd9adf6a2687d007d207d206a6a6888122f824020271131400adadbcf6a2687d007d207d206a6a688a2f827c1400914005eb90eb8583aa90382a10098a642801fd0100e78b00e78b64913c38e4658065826580097a007a00658064c27b80fc8000d8383a6465816503896583e5fbe4e84000cfaf16f6a2687d007d207d206a6a68bf99e836c1783872ebdb514d9c97c283b7f0ae5179029e2b6119c39462719e4f46ed8f7413e62c780a417877407e978f01a40711411b1acb773a96bdd93fa83bb5ca8435013c8c4b3ac91f4589cc780a38646583fa0064a18040fa0d3a2f';

// Official Jetton 2.0 Wallet from jetton-contract repo
const JETTON_WALLET_CODE_HEX = 'b5ee9c7241020d0100038a000114ff00f4a413f4bcf2c80b01020162020c02f4d001d0d3030171b0c0018e43135f038020d721ed44d0fa00fa40fa40d103d31f01840f218210178d4519ba0282107bdd97deba12b1f2f48040d721fa003012a002c85003fa0201cf1601cf16c9ed54e0fa40fa4031fa0031f401fa0031fa00013170f83a02d31f012082100f8a7ea5ba8e85303459db3ce03322030601f403d33f0101fa00fa4021fa4430c000f2e14ded44d0fa00fa40fa40d15219c705f2e0495114a120c2fff2af23800bd721d70b07f82a5425907054201314c85003fa0201cf1601cf16c9227871c8cb00cb04cb0012f400f400cb00c9514484f701f90001b07074c8cb02ca0712cb07cbf7c9d003fa40f401fa002004019620d70b009ad74bc00101c001b0f2b19130e2c88210178d451901cb1f500901cb3f5007fa0223cf1601cf1625fa025006cf16c9c8801801cb055003cf1670fa025a775003cb6bccccc944460500b02191729171e2f839206e9381239b9120e2216e94318128309101e25023a813a07381032c70f83ca00270f83612a00170f836a07381040282100966018070f837a0bcf2b0038050fb0001c85003fa0201cf1601cf16c9ed54025a8210178d4519ba8e84325adb3ce034218210595f07bcba8e843101db3ce0135f038210d372158cbadc840ff2f0070a02f4ed44d0fa00fa40fa40d106d33f0101fa00fa40fa4053a9c705b38e4ef82a5463c022800bd721d70b0755207054201314c85003fa0201cf1601cf16c9227871c8cb00cb04cb0012f400f400cb00c984f701f90001b07074c8cb02ca0712cb07cbf7c9d0500ac705f2e04a9139e25152a008fa0021925f04e30d2208090060c882107362d09c01cb1f2501cb3f5004fa0258cf1658cf16c9c8801001cb0524cf1658fa02017158cb6accc98011fb0000aed70b01c000b38e3b5043a1f82fa07381040282100966018070f837b60972fb02c8801001cb0501cf1670fa027001cb6a8210d53276db01cb1f0101cb3fc9810082fb0093145f04e258c85003fa0201cf1601cf16c9ed5401eeed44d0fa00fa40fa40d105d33f0101fa00fa40f401d15141a15237c705f2e04925c2fff2afc882107bdd97de01cb1f5801cb3f01fa0221cf1658cf16c9c8801801cb0525cf1670fa02017158cb6accc902f839206e943081160dde718102f270f8380170f836a0811bdf70f836a0bcf2b0018050fb00580b001cc85003fa0201cf1601cf16c9ed54001da0f605da89a1f401f481f481a3f055d51d4010';

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
  change_metadata_url: 0xcb862902,
  provide_wallet_address: 0x2c76b973,
  take_wallet_address: 0xd1735400,
  top_up: 0xd372158c,
  excesses: 0xd53276db,
};

function hexToCell(hex: string): Cell {
  return Cell.fromBoc(Buffer.from(hex, 'hex'))[0];
}

// Lazy loading to avoid issues during SSR
let _minterCode: Cell | null = null;
let _walletCode: Cell | null = null;

function getMinterCode(): Cell {
  if (!_minterCode) {
    _minterCode = hexToCell(JETTON_MINTER_CODE_HEX);
  }
  // Return a copy to avoid any potential reference issues
  return _minterCode;
}

function getWalletCode(): Cell {
  if (!_walletCode) {
    _walletCode = hexToCell(JETTON_WALLET_CODE_HEX);
  }
  // Return a copy to avoid any potential reference issues
  return _walletCode;
}

interface DeployResult {
  success: boolean;
  address?: string;
  error?: string;
}

export async function deployJettonMinter(
  tokenData: TokenData,
  walletAddress: Address,
  sendTransaction: (params: SendTransactionParams) => Promise<any>,
  sendMultipleMessages?: (messages: TransactionMessage[]) => Promise<any>
): Promise<DeployResult> {
  try {
    toast.loading('Preparing Jetton 2.0 contract...', { id: 'deploy' });

    // DEBUG: Log raw tokenData to see what we receive
    console.log('=== RAW TOKEN DATA RECEIVED ===');
    console.log('tokenData:', JSON.stringify(tokenData, null, 2));
    console.log('tokenData.name:', tokenData.name, 'type:', typeof tokenData.name);
    console.log('tokenData.symbol:', tokenData.symbol, 'type:', typeof tokenData.symbol);
    console.log('tokenData.description:', tokenData.description, 'type:', typeof tokenData.description);
    console.log('tokenData.image:', tokenData.image, 'type:', typeof tokenData.image);
    console.log('tokenData.imageData:', tokenData.imageData ? 'present' : 'missing', 'length:', tokenData.imageData?.length);
    console.log('tokenData.decimals:', tokenData.decimals, 'type:', typeof tokenData.decimals);
    console.log('================================');

    // Build on-chain metadata (TEP-64)
    // If imageData (base64) is provided, use data URI format
    let imageUrl = tokenData.image;
    if (tokenData.imageData && !imageUrl) {
      // Create data URI from base64 image data
      imageUrl = `data:image/png;base64,${tokenData.imageData}`;
    }
    
    // Ensure all required fields are present and not empty
    const name = (tokenData.name || '').trim();
    const symbol = (tokenData.symbol || '').trim().toUpperCase();
    const description = (tokenData.description || tokenData.name || '').trim();
    const image = imageUrl?.trim() || undefined;
    const decimals = tokenData.decimals?.toString() || '9';
    
    if (!name || !symbol) {
      throw new Error('Token name and symbol are required');
    }
    
    const metadata: JettonMetadata = {
      name: name,
      symbol: symbol,
      description: description || name,
      image: image,
      decimals: decimals,
    };

    console.log('=== PROCESSED METADATA ===');
    console.log('metadata.name:', metadata.name, 'length:', metadata.name.length);
    console.log('metadata.symbol:', metadata.symbol, 'length:', metadata.symbol.length);
    console.log('metadata.description:', metadata.description, 'length:', metadata.description?.length || 0);
    console.log('metadata.image:', metadata.image ? (metadata.image.substring(0, 100) + '...') : 'none', 'length:', metadata.image?.length || 0);
    console.log('metadata.decimals:', metadata.decimals);
    console.log('===========================');
    
    // Build on-chain metadata cell (TEP-64 format)
    // No need to calculate address first - on-chain metadata doesn't depend on address
    const contentCell = buildTokenMetadataCell(metadata);
    
    // Verify content cell is unique
    const contentCellHash = contentCell.hash().toString('hex');
    console.log('Content cell created (on-chain metadata TEP-64):', {
      bits: contentCell.bits.length,
      refs: contentCell.refs.length,
      hash: contentCellHash.substring(0, 16) + '...',
      metadata: {
        name: metadata.name,
        symbol: metadata.symbol,
        hasDescription: !!metadata.description,
        hasImage: !!metadata.image,
      },
    });

    const supplyWithDecimals = BigInt(tokenData.totalSupply) * BigInt(10 ** tokenData.decimals);

    // Jetton 2.0 data structure (from jetton-minter.fc):
    // total_supply:Coins admin_address:MsgAddress next_admin_address:MsgAddress jetton_wallet_code:^Cell metadata_uri:^Cell
    // CRITICAL: Order must match load_data() in contract!
    const minterData = beginCell()
      .storeCoins(0)                    // total_supply (0 for new token)
      .storeAddress(walletAddress)      // admin_address
      .storeAddress(null)                // next_admin_address (null initially)
      .storeRef(getWalletCode())        // jetton_wallet_code (library ref for Jetton 2.0)
      .storeRef(contentCell)            // metadata_uri (on-chain TEP-64 metadata with 0x00 prefix)
      .endCell();

    // Verify minterData is unique
    const minterDataHash = minterData.hash().toString('hex');
    console.log('Minter data created:', {
      hash: minterDataHash.substring(0, 16) + '...',
      admin: walletAddress.toString(),
    });

    const stateInit = {
      code: getMinterCode(),
      data: minterData,
    };

    // Calculate final address from stateInit - this MUST be unique for each token
    const minterAddress = contractAddress(0, stateInit);
    
    // Verify stateInit is unique
    const stateInitHash = beginCell()
      .store(storeStateInit(stateInit))
      .endCell()
      .hash()
      .toString('hex');
    
    console.log('=== DEPLOYMENT INFO ===');
    console.log('Token name:', tokenData.name);
    console.log('Token symbol:', tokenData.symbol);
    console.log('Wallet address:', walletAddress.toString());
    console.log('Content cell hash:', contentCellHash.substring(0, 16) + '...');
    console.log('Minter data hash:', minterDataHash.substring(0, 16) + '...');
    console.log('StateInit hash:', stateInitHash.substring(0, 16) + '...');
    console.log('Contract address:', minterAddress.toString());
    console.log('======================');

    const stateInitCell = beginCell()
      .store(storeStateInit(stateInit))
      .endCell();

    // Build mint message
    const internalTransferMsg = beginCell()
      .storeUint(Op.internal_transfer, 32)
      .storeUint(0, 64)
      .storeCoins(supplyWithDecimals)
      .storeAddress(null)
      .storeAddress(walletAddress)
      .storeCoins(toNano('0.01'))
      .storeMaybeRef(null)
      .endCell();

    const mintBody = beginCell()
      .storeUint(Op.mint, 32)
      .storeUint(0, 64)
      .storeAddress(walletAddress)
      .storeCoins(toNano('0.1'))
      .storeRef(internalTransferMsg)
      .endCell();

    toast.loading('Confirm transaction in wallet (1 TON)...', { id: 'deploy' });

    const stateInitBoc = stateInitCell.toBoc();
    const mintBodyBoc = mintBody.toBoc();
    
    // CRITICAL: Verify this is a NEW deployment
    // Each token MUST have unique metadata to get unique address
    const stateInitBocHash = Buffer.from(stateInitBoc).toString('hex').substring(0, 32);
    
    console.log('=== FINAL DEPLOYMENT VERIFICATION ===');
    console.log('Token name:', tokenData.name);
    console.log('Token symbol:', tokenData.symbol);
    console.log('Contract address:', minterAddress.toString());
    console.log('StateInit BOC hash:', stateInitBocHash + '...');
    console.log('StateInit length:', stateInitBoc.length);
    console.log('Payload length:', mintBodyBoc.length);
    console.log('=====================================');
    
    // WARNING: If address is the same as previous deployment, this will MINT to existing contract!
    // This should NEVER happen if metadata is different
    
    const deployMessage: TransactionMessage = {
      address: minterAddress.toString(),
      amount: DEPLOY_FEE.toString(),
      stateInit: stateInitBoc.toString('base64'),
      payload: mintBodyBoc.toString('base64'),
    };

    const monetizationMessage: TransactionMessage = {
      address: MONETIZATION_WALLET,
      amount: MONETIZATION_FEE.toString(),
    };

    console.log('Sending transaction with:');
    console.log('  Deploy to:', deployMessage.address);
    console.log('  Monetization to:', monetizationMessage.address);
    console.log('  Total amount:', (DEPLOY_FEE + MONETIZATION_FEE).toString());

    let result;
    
    // Always use sendMultipleMessages if available
    if (sendMultipleMessages) {
      result = await sendMultipleMessages([deployMessage, monetizationMessage]);
    } else {
      // Fallback: send deploy first, then monetization
      result = await sendTransaction({
        to: minterAddress.toString(),
        value: DEPLOY_FEE.toString(),
        stateInit: stateInitBoc.toString('base64'),
        body: mintBodyBoc.toString('base64'),
      });
      
      // Send monetization separately if deploy succeeded
      if (result) {
        await sendTransaction({
          to: MONETIZATION_WALLET,
          value: MONETIZATION_FEE.toString(),
        });
      }
    }
    
        if (result) {
          // Metadata is now stored on-chain, no need for external storage
          console.log('Jetton 2.0 deployed with on-chain metadata:', {
            address: minterAddress.toString(),
            name: metadata.name,
            symbol: metadata.symbol,
          });
          
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
    code: getWalletCode(),
    data: walletData,
  });
}

// STON.fi pool creation URL
export function getStonfiPoolUrl(tokenAddress: string): string {
  return `https://app.ston.fi/pools/create?token0=EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c&token1=${tokenAddress}`;
}

export { Op as JettonOpcodes };
export const JETTON_VERSION = '2.0';
