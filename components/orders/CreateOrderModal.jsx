'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { VersionedTransaction } from '@solana/web3.js';
import {
  X,
  TrendingDown,
  TrendingUp,
  Target,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Search,
  Check,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSolPrice } from '@/lib/jupiter/hooks';
import {
  createLimitBuyOrder,
  createLimitSellOrder,
  SOL_MINT,
} from '@/lib/jupiter/limit-order';

const orderTypes = [
  { id: 'limit_buy', label: 'Limit Buy', icon: TrendingDown, color: 'text-green-400', side: 'buy' },
  { id: 'limit_sell', label: 'Limit Sell', icon: TrendingUp, color: 'text-blue-400', side: 'sell' },
  { id: 'stop_loss', label: 'Stop Loss', icon: ShieldAlert, color: 'text-red-400', side: 'sell' },
  { id: 'take_profit', label: 'Take Profit', icon: Target, color: 'text-purple-400', side: 'sell' },
];

// Phases for order creation flow
const PHASE = {
  INPUT: 'input',
  BUILDING: 'building',
  SIGNING: 'signing',
  CONFIRMING: 'confirming',
  COMPLETE: 'complete',
};

export function CreateOrderModal({ isOpen, onClose, watchlistTokens = [], preselectedToken }) {
  const { connected, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { price: solPrice } = useSolPrice();

  const [orderType, setOrderType] = useState('limit_buy');
  const [selectedToken, setSelectedToken] = useState(preselectedToken || null);
  const [triggerPrice, setTriggerPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [expiresIn, setExpiresIn] = useState('7'); // days
  const [searchQuery, setSearchQuery] = useState('');

  const [phase, setPhase] = useState(PHASE.INPUT);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const selectedType = orderTypes.find((t) => t.id === orderType);
  const isBuyOrder = selectedType?.side === 'buy';

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedToken(preselectedToken || null);
      setTriggerPrice('');
      setAmount('');
      setError('');
      setPhase(PHASE.INPUT);
      setResult(null);
    }
  }, [isOpen, preselectedToken]);

  const filteredTokens = watchlistTokens.filter(
    (t) =>
      t.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate expected output based on trigger price
  const calculateExpectedAmount = useCallback(() => {
    if (!triggerPrice || !amount || !selectedToken?.priceUsd) return null;

    const price = parseFloat(triggerPrice);
    const inputAmount = parseFloat(amount);

    if (isBuyOrder) {
      // Buy order: spending SOL, receiving tokens
      // triggerPrice is USD price per token
      // Calculate how many tokens we get for our SOL at this price
      // SOL value in USD = amount * SOL price (we'll approximate with current market)
      // But for limit orders, we need to specify expected token amount
      // If user wants to buy at $X per token, and they're spending Y SOL
      // They expect to receive: (Y * SOL_USD_price) / X tokens
      // For now, we'll use current token price ratio
      const currentTokenPrice = selectedToken.priceUsd;
      const priceRatio = currentTokenPrice / price;
      return inputAmount * priceRatio * (selectedToken.currentSolPrice || 1);
    } else {
      // Sell order: selling tokens, receiving SOL
      // triggerPrice is USD price per token
      // Calculate SOL we get for selling tokens at this price
      return inputAmount * price / (selectedToken.solPrice || 197); // Approximate SOL price
    }
  }, [triggerPrice, amount, selectedToken, isBuyOrder]);

  const handleSubmit = async () => {
    setError('');

    if (!connected || !publicKey) {
      setError('Please connect your wallet');
      return;
    }

    if (!selectedToken) {
      setError('Please select a token');
      return;
    }

    if (!triggerPrice || parseFloat(triggerPrice) <= 0) {
      setError('Please enter a valid trigger price');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setPhase(PHASE.BUILDING);

      const expiresAt = expiresIn
        ? new Date(Date.now() + parseInt(expiresIn) * 24 * 60 * 60 * 1000)
        : null;

      const triggerPriceFloat = parseFloat(triggerPrice);
      const amountFloat = parseFloat(amount);

      // Calculate expected amounts for the limit order
      // For Jupiter limit orders, we need to specify exact amounts
      let orderResult;
      let inputMint, outputMint, makingAmount, takingAmount;

      if (isBuyOrder) {
        // Limit Buy: Spend SOL to get tokens
        // Need to calculate how many tokens we expect at the trigger price
        // Expected tokens = (SOL amount * SOL USD price) / trigger price per token
        const currentSolPrice = solPrice || 200; // Fallback if price not loaded
        const expectedTokens = (amountFloat * currentSolPrice) / triggerPriceFloat;

        inputMint = SOL_MINT;
        outputMint = selectedToken.address;
        makingAmount = Math.floor(amountFloat * 1e9).toString(); // lamports
        takingAmount = Math.floor(expectedTokens * Math.pow(10, selectedToken.decimals || 9)).toString();

        orderResult = await createLimitBuyOrder({
          maker: publicKey.toBase58(),
          outputMint: selectedToken.address,
          inputAmountSol: amountFloat,
          expectedTokenAmount: expectedTokens,
          outputDecimals: selectedToken.decimals || 9,
          expireAt: expiresAt,
        });
      } else {
        // Limit Sell (including stop loss, take profit): Sell tokens to get SOL
        // Expected SOL = (token amount * trigger price) / SOL USD price
        const currentSolPrice = solPrice || 200; // Fallback if price not loaded
        const expectedSol = (amountFloat * triggerPriceFloat) / currentSolPrice;

        inputMint = selectedToken.address;
        outputMint = SOL_MINT;
        makingAmount = Math.floor(amountFloat * Math.pow(10, selectedToken.decimals || 9)).toString();
        takingAmount = Math.floor(expectedSol * 1e9).toString(); // lamports

        orderResult = await createLimitSellOrder({
          maker: publicKey.toBase58(),
          inputMint: selectedToken.address,
          inputAmount: amountFloat,
          inputDecimals: selectedToken.decimals || 9,
          expectedSolAmount: expectedSol,
          expireAt: expiresAt,
        });
      }

      setPhase(PHASE.SIGNING);

      // Deserialize and sign the transaction
      const txBuffer = Buffer.from(orderResult.tx, 'base64');
      const transaction = VersionedTransaction.deserialize(txBuffer);

      const signedTx = await signTransaction(transaction);

      setPhase(PHASE.CONFIRMING);

      // Send transaction
      const txSignature = await connection.sendTransaction(signedTx, {
        skipPreflight: false,
        maxRetries: 3,
      });

      // Wait for confirmation
      await connection.confirmTransaction(txSignature, 'confirmed');

      // Save order to database
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: selectedToken.address,
          symbol: selectedToken.symbol,
          orderType,
          side: selectedType.side,
          amountSol: isBuyOrder ? amountFloat : null,
          amountTokens: !isBuyOrder ? amountFloat : null,
          triggerPrice: triggerPriceFloat,
          currentPrice: selectedToken.priceUsd,
          expiresAt: expiresAt?.toISOString() || null,
          jupiterOrderPubkey: orderResult.order,
          txSignature,
          inputMint,
          outputMint,
          makingAmount,
          takingAmount,
          tokenDecimals: selectedToken.decimals || 9,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save order');
      }

      setResult({
        orderPubkey: orderResult.order,
        txSignature,
      });
      setPhase(PHASE.COMPLETE);
    } catch (err) {
      console.error('Order creation error:', err);

      let errorMessage = err.message || 'Failed to create order';

      // Provide friendlier error messages
      if (errorMessage.includes('at least 5 USD') || errorMessage.includes('minimum')) {
        errorMessage = 'Order value must be at least $5 USD. Please increase the amount.';
      } else if (errorMessage.includes('User rejected')) {
        errorMessage = 'Transaction rejected by user';
      } else if (errorMessage.includes('insufficient')) {
        errorMessage = 'Insufficient balance for this order';
      }

      setError(errorMessage);
      setPhase(PHASE.INPUT);
    }
  };

  if (!isOpen) return null;

  // Success view
  if (phase === PHASE.COMPLETE && result) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-dark-card border border-dark-border rounded-2xl shadow-2xl p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Order Created!</h3>
            <p className="text-gray-400 mb-4">
              Your Jupiter limit order is now active on-chain
            </p>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-green-400 mb-1 flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" />
                Auto-executing on Jupiter
              </p>
              <p className="text-xs text-gray-400">
                Your order will execute automatically when the price target is reached
              </p>
            </div>

            <div className="space-y-2 text-sm mb-6">
              <a
                href={`https://solscan.io/tx/${result.txSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-brand-400 hover:text-brand-300"
              >
                View transaction <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={`https://jup.ag/limit/${result.orderPubkey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-gray-400 hover:text-white"
              >
                View on Jupiter <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading states
  if (phase !== PHASE.INPUT) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative w-full max-w-lg bg-dark-card border border-dark-border rounded-2xl shadow-2xl p-6">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-brand-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {phase === PHASE.BUILDING && 'Building Order...'}
              {phase === PHASE.SIGNING && 'Sign in Wallet'}
              {phase === PHASE.CONFIRMING && 'Confirming Transaction...'}
            </h3>
            <p className="text-gray-400 text-sm">
              {phase === PHASE.BUILDING && 'Preparing Jupiter limit order transaction'}
              {phase === PHASE.SIGNING && 'Please approve the transaction in your wallet'}
              {phase === PHASE.CONFIRMING && 'Waiting for blockchain confirmation'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-dark-card border border-dark-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Branding */}
        <div className="flex items-center justify-center gap-2 pt-4 pb-2">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-lg blur-md opacity-50" />
            <img src="/icon.svg" alt="Maze" className="relative w-7 h-7" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Maze
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4 border-b border-dark-border">
          <div>
            <h2 className="text-lg font-semibold text-white">Create Limit Order</h2>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-green-400" />
              Powered by Jupiter - Auto-executing
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* SOL Price Indicator */}
          {solPrice > 0 && (
            <div className="flex items-center justify-between p-3 bg-dark-bg rounded-lg border border-dark-border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">S</span>
                </div>
                <span className="text-gray-400 text-sm">SOL Price</span>
              </div>
              <span className="text-white font-medium">${solPrice.toFixed(2)}</span>
            </div>
          )}

          {/* Wallet Check */}
          {!connected && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Connect your wallet to create orders
            </div>
          )}

          {/* Order Type */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Order Type</label>
            <div className="grid grid-cols-2 gap-2">
              {orderTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setOrderType(type.id)}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border transition-colors',
                      orderType === type.id
                        ? 'bg-brand-400/10 border-brand-400/50'
                        : 'bg-dark-bg border-dark-border hover:border-gray-600'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', type.color)} />
                    <span className="text-sm text-white">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Token Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Token</label>
            {selectedToken ? (
              <div
                className="flex items-center justify-between p-3 bg-dark-bg border border-dark-border rounded-lg cursor-pointer hover:border-gray-600"
                onClick={() => setSelectedToken(null)}
              >
                <div className="flex items-center gap-3">
                  {selectedToken.logoURI ? (
                    <img
                      src={selectedToken.logoURI}
                      alt={selectedToken.symbol}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-dark-card flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-400">
                        {selectedToken.symbol?.slice(0, 2)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-white">{selectedToken.symbol}</p>
                    <p className="text-xs text-gray-500">{selectedToken.name}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-400">Change</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tokens..."
                    className="w-full pl-10 pr-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-400/50"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredTokens.map((token) => (
                    <button
                      key={token.address}
                      type="button"
                      onClick={() => {
                        setSelectedToken(token);
                        setSearchQuery('');
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-dark-hover transition-colors"
                    >
                      {token.logoURI ? (
                        <img
                          src={token.logoURI}
                          alt={token.symbol}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-dark-card flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-400">
                            {token.symbol?.slice(0, 2)}
                          </span>
                        </div>
                      )}
                      <span className="text-white">{token.symbol}</span>
                      {token.priceUsd && (
                        <span className="text-xs text-gray-500 ml-auto">
                          ${token.priceUsd < 0.001 ? token.priceUsd.toExponential(2) : token.priceUsd.toFixed(4)}
                        </span>
                      )}
                    </button>
                  ))}
                  {filteredTokens.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No tokens found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Trigger Price */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              {orderType === 'limit_buy'
                ? 'Buy when price drops to'
                : orderType === 'limit_sell'
                ? 'Sell when price rises to'
                : orderType === 'stop_loss'
                ? 'Sell if price drops to'
                : 'Sell when price reaches'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-400/50"
                step="any"
              />
            </div>
            {selectedToken?.priceUsd && triggerPrice && (
              <p className="text-xs text-gray-500 mt-1">
                Current: ${selectedToken.priceUsd < 0.001
                  ? selectedToken.priceUsd.toExponential(2)
                  : selectedToken.priceUsd.toFixed(6)}
                {' '}
                ({((parseFloat(triggerPrice) - selectedToken.priceUsd) / selectedToken.priceUsd * 100).toFixed(1)}%)
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              {isBuyOrder ? 'Amount to spend (SOL)' : `Amount to sell (${selectedToken?.symbol || 'tokens'})`}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={isBuyOrder ? '0.0 SOL' : '0'}
              className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-400/50"
              step="any"
            />
            {isBuyOrder && solPrice > 0 && amount && parseFloat(amount) > 0 && (
              <p className="text-xs text-brand-400 mt-1">
                ≈ ${(parseFloat(amount) * solPrice).toFixed(2)} USD
              </p>
            )}
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Expires in</label>
            <select
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:border-brand-400/50"
            >
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="">Never</option>
            </select>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400 flex items-start gap-2">
            <Zap className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p>Jupiter limit orders execute automatically on-chain when your price target is reached.</p>
              <p className="text-xs text-gray-400 mt-1">Minimum order value: $5 USD</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!connected || !selectedToken || !triggerPrice || !amount}
            className={cn(
              'w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2',
              !connected || !selectedToken || !triggerPrice || !amount
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-brand-500 hover:bg-brand-600 text-white'
            )}
          >
            {selectedType && <selectedType.icon className="w-5 h-5" />}
            Create {selectedType?.label}
          </button>
        </div>
      </div>
    </div>
  );
}
