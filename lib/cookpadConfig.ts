/**
 * Cookpad Contract Configuration
 * 
 * After deploying the Cookpad contract, update COOKPAD_CONTRACT_ADDRESS
 * with the deployed contract address.
 * 
 * To deploy:
 * 1. Compile the contract: func build contracts/cookpad/s_minter.fc -o build/cookpad.fif
 * 2. Deploy using deployCookpad() from lib/deployCookpad.ts
 * 3. Update COOKPAD_CONTRACT_ADDRESS below with the deployed address
 */

// Cookpad contract address - update this after deployment
export const COOKPAD_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_COOKPAD_CONTRACT || '';

// Fee wallet (fixed)
export const COOKPAD_FEE_WALLET = 'UQDjQOdWTP1bPpGpYExAsCcVLGPN_pzGvdno3aCk565ZnQIz';

// Max liquidity in TON
export const COOKPAD_MAX_LIQUIDITY_TON = 300;

// Fee percentage
export const COOKPAD_FEE_PERCENT = 1;

