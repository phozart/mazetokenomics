'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Get Solana RPC endpoint
// For production: Set SOLANA_RPC_URL in your .env file before building
// The public endpoint is rate-limited and may block requests from servers
function getSolanaRpcEndpoint() {
  // Direct RPC URL takes priority (set at build time)
  if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  }

  // Construct from Helius API key if available (set at build time)
  if (process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
    return `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`;
  }

  // Use a free RPC that's more reliable than the public one
  // QuickNode and other providers offer free tiers
  // For now, use Solana's devnet-compatible public RPC
  console.warn('[Wallet] No RPC configured. Using fallback. Set NEXT_PUBLIC_SOLANA_RPC_URL for production.');

  // Use a public RPC that allows CORS - these may still be rate limited
  // Best practice: Get a free Helius/QuickNode API key and set at build time
  return 'https://api.mainnet-beta.solana.com';
}

const SOLANA_RPC_ENDPOINT = getSolanaRpcEndpoint();

export function WalletProvider({ children }) {
  // Configure supported wallets
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], []);

  return (
    <ConnectionProvider endpoint={SOLANA_RPC_ENDPOINT}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
