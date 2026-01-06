# Deployment Guide

## Vercel Deployment

1. Push your code to GitHub repository: `https://github.com/ViberKoder/cook`

2. Connect to Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will automatically detect Next.js

3. Configure Environment Variables (if needed):
   - `NEXT_PUBLIC_TON_CONNECT_MANIFEST_URL`: `https://www.cook.tg/tonconnect-manifest.json`

4. Deploy:
   - Vercel will automatically build and deploy
   - Your site will be available at the Vercel URL

## TON Connect Manifest

Make sure `tonconnect-manifest.json` is accessible at:
`https://www.cook.tg/tonconnect-manifest.json`

## Important Notes

- Before production deployment, update the contract code in `lib/jetton2.ts` with actual compiled Jetton 2.0 contracts (see CONTRACT_SETUP.md)
- Test thoroughly on testnet before mainnet deployment
- Ensure your domain `cook.tg` is properly configured for TON Connect




