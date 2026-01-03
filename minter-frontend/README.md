# Cook - Jetton Minter for TON

<p align="center">
  <img src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" width="120" height="120" alt="Cook Logo">
</p>

<p align="center">
  <strong>Cook your Jetton 2.0 on TON</strong>
</p>

Cook is a modern web application for creating and managing Jetton tokens on The Open Network (TON). Features **true on-chain metadata** (TEP-64) based on [ton-blockchain/minter-contract](https://github.com/ton-blockchain/minter-contract).

## Features

- 🍗 **On-chain Metadata** - True TEP-64 on-chain metadata for maximum compatibility
- ⚡ **Jetton 2.0** - Uses latest Jetton standard with improved performance
- 🔗 **Full Compatibility** - Works with DeDust, STON.fi, TonViewer, and all TON wallets
- ❄️ **Ice Jetton** - Create freezable tokens based on stablecoin contracts
- 🤖 **AI Assistant** - Get help with token narratives, tokenomics, and ideas
- 🎨 **Modern UI** - Clean, light theme with orange gradients
- 📱 **TON Connect** - Easy wallet connection with TON Connect 2.0
- 🛠️ **Admin Panel** - Manage minting, admin rights, metadata, and token settings

## Sections

### Jetton 2.0
Standard Jetton tokens with on-chain metadata. Perfect for:
- Utility tokens
- Governance tokens
- Meme tokens
- Any fungible token

### Ice Jetton ❄️
Freezable tokens based on TON's stablecoin contract. Features:
- Admin can freeze/unfreeze individual wallets
- Frozen wallets cannot transfer tokens
- Perfect for stablecoins and regulated assets

### AI Chat 🤖
Interactive assistant to help you:
- Brainstorm token names and narratives
- Design tokenomics
- Create token descriptions
- Plan lockup strategies

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A TON wallet (Tonkeeper, Tonhub, etc.)

### Installation

```bash
cd minter-frontend
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## How It Works

### Token Creation

1. **Connect Wallet** - Connect your TON wallet using TON Connect
2. **Fill Token Details** - Enter name, symbol, description, image, and supply
3. **Deploy** - Confirm the transaction (1 TON deployment cost)
4. **Done!** - Your token is now live on TON

### On-chain Metadata (TEP-64)

Cook uses true on-chain metadata storage:
- Token name, symbol, description stored directly in contract
- Image can be uploaded or referenced via URL
- Maximum compatibility with all explorers and DEXes
- Optional: Provide your own off-chain metadata URL

### Admin Panel

After deployment, you can manage your token:

- **Mint** - Create additional tokens (if you're the admin)
- **Update Metadata** - Change token name, symbol, description, image
- **Transfer Admin** - Transfer admin rights to another address
- **Revoke Admin** - Make the token fully decentralized (irreversible!)

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Blockchain**: @ton/core, @tonconnect/ui-react
- **Smart Contracts**: Compiled FunC contracts from minter-contract

## Contract Details

### Jetton 2.0
Based on minter-contract with on-chain metadata support:
- TEP-74 (Jetton Standard) compatible
- TEP-64 (Token Data Standard) on-chain metadata
- Admin management with transfer and revoke functionality
- Optimized gas usage

### Ice Jetton (Stablecoin)
Based on stablecoin-contract:
- All Jetton 2.0 features
- `set_status` operation for freezing wallets
- Lock types: unlock, out, in, full

## Links

- [TON Documentation](https://docs.ton.org)
- [Jetton Standard (TEP-74)](https://github.com/ton-blockchain/TEPs/blob/master/text/0074-jettons-standard.md)
- [Token Data Standard (TEP-64)](https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md)
- [TON Explorer](https://tonviewer.com)
- [Cook Community](https://t.me/cookcm)

## License

MIT

© 2026 Cook. Built on TON Blockchain.
