# Jetton 2.0 Contract Setup

## Important Note

The contract code in `lib/jetton2.ts` uses placeholder base64 strings. For production use, you need to:

1. Clone the official Jetton 2.0 repository:
   ```bash
   git clone https://github.com/ton-blockchain/jetton-contract.git
   cd jetton-contract
   git checkout jetton-2.0
   ```

2. Compile the contracts using FunC compiler:
   ```bash
   # Compile minter contract
   func -o build/jetton-minter.fif -SPA stdlib.fc jetton-minter.fc
   
   # Compile wallet contract
   func -o build/jetton-wallet.fif -SPA stdlib.fc jetton-wallet.fc
   ```

3. Convert compiled .fif files to base64 and update the constants in `lib/jetton2.ts`:
   ```typescript
   const JETTON_MINTER_CODE = Cell.fromBase64('YOUR_COMPILED_BASE64_HERE')
   const JETTON_WALLET_CODE = Cell.fromBase64('YOUR_COMPILED_BASE64_HERE')
   ```

## Onchain Metadata Format

Jetton 2.0 uses onchain metadata stored in a dictionary:
- Key: SHA256 hash of the metadata key name (e.g., "name", "symbol")
- Value: Cell containing the metadata value

The current implementation in `createOnchainMetadata()` follows this format.






