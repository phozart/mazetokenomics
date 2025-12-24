'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { parseAmount, formatAmount, calculatePriceImpact, SOL_MINT } from './client';

// Swap states
export const SWAP_STATE = {
  IDLE: 'IDLE',
  FETCHING_QUOTE: 'FETCHING_QUOTE',
  READY: 'READY',
  AWAITING_SIGNATURE: 'AWAITING_SIGNATURE',
  CONFIRMING: 'CONFIRMING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
};

/**
 * Hook to fetch quotes with debouncing
 */
export function useQuote({ inputToken, outputToken, inputAmount, slippageBps = 100 }) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  const fetchQuote = useCallback(async () => {
    if (!inputToken || !outputToken || !inputAmount || parseFloat(inputAmount) <= 0) {
      setQuote(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const amount = parseAmount(inputAmount, inputToken.decimals);
      const params = new URLSearchParams({
        inputMint: inputToken.address,
        outputMint: outputToken.address,
        amount,
        slippageBps: slippageBps.toString(),
      });

      const response = await fetch(`/api/jupiter/quote?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get quote');
      }

      setQuote(data);
    } catch (err) {
      setError(err.message);
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [inputToken, outputToken, inputAmount, slippageBps]);

  // Debounced fetch
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(fetchQuote, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchQuote]);

  return { quote, loading, error, refetch: fetchQuote };
}

/**
 * Hook to execute swaps
 */
export function useSwap() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const [state, setState] = useState(SWAP_STATE.IDLE);
  const [error, setError] = useState(null);
  const [txSignature, setTxSignature] = useState(null);

  const executeSwap = useCallback(async (quote) => {
    if (!connected || !publicKey || !signTransaction) {
      setError('Wallet not connected');
      setState(SWAP_STATE.ERROR);
      return null;
    }

    if (!quote) {
      setError('No quote available');
      setState(SWAP_STATE.ERROR);
      return null;
    }

    setError(null);
    setTxSignature(null);

    try {
      // Get swap transaction
      setState(SWAP_STATE.AWAITING_SIGNATURE);

      const response = await fetch('/api/jupiter/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: publicKey.toBase58(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create swap transaction');
      }

      // Deserialize transaction
      const swapTransactionBuf = Buffer.from(data.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // Sign transaction
      const signedTransaction = await signTransaction(transaction);

      // Send transaction
      setState(SWAP_STATE.CONFIRMING);

      const rawTransaction = signedTransaction.serialize();
      const txid = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
        maxRetries: 2,
      });

      setTxSignature(txid);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(txid, 'confirmed');

      if (confirmation.value.err) {
        throw new Error('Transaction failed on chain');
      }

      setState(SWAP_STATE.SUCCESS);
      return txid;
    } catch (err) {
      console.error('Swap error:', err);
      setError(err.message || 'Swap failed');
      setState(SWAP_STATE.ERROR);
      return null;
    }
  }, [connection, publicKey, signTransaction, connected]);

  const reset = useCallback(() => {
    setState(SWAP_STATE.IDLE);
    setError(null);
    setTxSignature(null);
  }, []);

  return {
    state,
    error,
    txSignature,
    executeSwap,
    reset,
  };
}

/**
 * Hook to get token balances
 */
export function useTokenBalances(tokens) {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!connected || !publicKey || !tokens?.length) {
      setBalances({});
      return;
    }

    setLoading(true);

    try {
      const newBalances = {};

      // Get SOL balance
      const solBalance = await connection.getBalance(publicKey);
      newBalances[SOL_MINT] = solBalance;

      // Get SPL token balances
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: new (await import('@solana/web3.js')).PublicKey(
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        ),
      });

      for (const account of tokenAccounts.value) {
        const mint = account.account.data.parsed.info.mint;
        const amount = account.account.data.parsed.info.tokenAmount.amount;
        newBalances[mint] = parseInt(amount);
      }

      setBalances(newBalances);
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, connected, tokens]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return { balances, loading, refetch: fetchBalances };
}

/**
 * Hook to get SOL balance
 */
export function useSolBalance() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!connected || !publicKey) {
      setBalance(0);
      return;
    }

    setLoading(true);

    try {
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error('Failed to fetch SOL balance:', err);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, connected]);

  useEffect(() => {
    fetchBalance();
    // Set up interval to refresh
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
}

/**
 * Hook to get current SOL price in USD
 */
export function useSolPrice() {
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPrice = useCallback(async () => {
    try {
      // Use Jupiter price API for SOL
      const response = await fetch(
        'https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112'
      );
      const data = await response.json();
      const solPrice = data.data?.['So11111111111111111111111111111111111111112']?.price;
      if (solPrice) {
        setPrice(parseFloat(solPrice));
      }
    } catch (err) {
      console.error('Failed to fetch SOL price:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrice();
    // Refresh price every 30 seconds
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  return { price, loading, refetch: fetchPrice };
}
