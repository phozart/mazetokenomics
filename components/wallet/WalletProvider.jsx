'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Get Solana RPC endpoint
// Priority: NEXT_PUBLIC_SOLANA_RPC_URL > constructed from NEXT_PUBLIC_HELIUS_API_KEY > public endpoint
function getSolanaRpcEndpoint() {
  // Direct RPC URL takes priority
  if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  }

  // Construct from Helius API key if available
  if (process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
    return `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`;
  }

  // Fallback to public endpoint (rate-limited)
  // For production, set NEXT_PUBLIC_SOLANA_RPC_URL or NEXT_PUBLIC_HELIUS_API_KEY
  console.warn('[Wallet] Using public Solana RPC - may be rate limited. Set NEXT_PUBLIC_SOLANA_RPC_URL for better reliability.');
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
