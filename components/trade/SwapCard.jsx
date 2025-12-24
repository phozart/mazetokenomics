'use client';

import { useState, useCallback, useEffect } from 'react';
import { ArrowDownUp, RefreshCw, Zap } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { TokenInput } from './TokenInput';
import { TokenSelectModal } from './TokenSelectModal';
import { SwapDetails } from './SwapDetails';
import { SwapButton } from './SwapButton';
import { useQuote, useSwap, useSolBalance, SWAP_STATE } from '@/lib/jupiter/hooks';
import { POPULAR_TOKENS, formatTokenBalance } from '@/lib/jupiter/tokens';
import { formatAmount, SOL_MINT } from '@/lib/jupiter/client';
import { cn } from '@/lib/utils';

// Default tokens
const DEFAULT_INPUT_TOKEN = POPULAR_TOKENS[0]; // SOL
const DEFAULT_OUTPUT_TOKEN = null;

export function SwapCard({ watchlistTokens = [], preselectedToken }) {
  const { connected, publicKey } = useWallet();
  const { balance: solBalance, refetch: refetchSolBalance } = useSolBalance();

  // Token states
  const [inputToken, setInputToken] = useState(DEFAULT_INPUT_TOKEN);
  const [outputToken, setOutputToken] = useState(preselectedToken || DEFAULT_OUTPUT_TOKEN);
  const [inputAmount, setInputAmount] = useState('');
  const [slippageBps, setSlippageBps] = useState(100);

  // Modal states
  const [selectingFor, setSelectingFor] = useState(null); // 'input' | 'output'

  // Token balances
  const [tokenBalances, setTokenBalances] = useState({});

  // Quote hook
  const { quote, loading: quoteLoading, error: quoteError } = useQuote({
    inputToken,
    outputToken,
    inputAmount,
    slippageBps,
  });

  // Swap hook
  const { state: swapState, error: swapError, txSignature, executeSwap, reset: resetSwap } = useSwap();

  // Set preselected token
  useEffect(() => {
    if (preselectedToken) {
      setOutputToken(preselectedToken);
    }
  }, [preselectedToken]);

  // Update SOL balance in tokenBalances
  useEffect(() => {
    if (solBalance > 0) {
      setTokenBalances(prev => ({
        ...prev,
        [SOL_MINT]: solBalance * Math.pow(10, 9), // Convert to lamports
      }));
    }
  }, [solBalance]);

  // Get output amount from quote
  const outputAmount = quote
    ? formatAmount(quote.outAmount, outputToken?.decimals || 9)
    : '';

  // Check if user has sufficient balance
  const inputBalanceRaw = tokenBalances[inputToken?.address] || 0;
  const inputBalance = inputToken
    ? inputBalanceRaw / Math.pow(10, inputToken.decimals)
    : 0;
  const insufficientBalance = inputAmount && parseFloat(inputAmount) > inputBalance;

  // Switch tokens
  const handleSwitchTokens = useCallback(() => {
    if (!outputToken) return;
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setInputAmount(outputAmount);
  }, [inputToken, outputToken, outputAmount]);

  // Handle token selection
  const handleTokenSelect = useCallback((token) => {
    if (selectingFor === 'input') {
      // If selecting same as output, switch
      if (outputToken?.address === token.address) {
        setOutputToken(inputToken);
      }
      setInputToken(token);
    } else {
      // If selecting same as input, switch
      if (inputToken?.address === token.address) {
        setInputToken(outputToken);
      }
      setOutputToken(token);
    }
    setSelectingFor(null);
  }, [selectingFor, inputToken, outputToken]);

  // Handle swap success - refresh balances
  const handleSwapComplete = useCallback(() => {
    refetchSolBalance();
    setInputAmount('');
  }, [refetchSolBalance]);

  // Reset after success
  useEffect(() => {
    if (swapState === SWAP_STATE.SUCCESS) {
      handleSwapComplete();
    }
  }, [swapState, handleSwapComplete]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Swap</h2>
            <span className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 rounded-full text-[10px] font-medium text-purple-300">
              <Zap className="w-3 h-3" />
              Solana
            </span>
          </div>
          <button
            onClick={() => {
              resetSwap();
              setInputAmount('');
            }}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
            title="Reset"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Input Token */}
        <TokenInput
          label="You Pay"
          token={inputToken}
          amount={inputAmount}
          onAmountChange={setInputAmount}
          onTokenSelect={() => setSelectingFor('input')}
          balance={inputBalance}
          showMaxButton={connected}
          disabled={swapState !== SWAP_STATE.IDLE && swapState !== SWAP_STATE.ERROR}
        />

        {/* Switch Button */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            onClick={handleSwitchTokens}
            disabled={!outputToken}
            className={cn(
              'p-2 bg-dark-card border border-dark-border rounded-xl transition-all',
              outputToken
                ? 'hover:bg-dark-hover hover:border-brand-400/50 hover:rotate-180'
                : 'opacity-50 cursor-not-allowed'
            )}
          >
            <ArrowDownUp className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Output Token */}
        <TokenInput
          label="You Receive"
          token={outputToken}
          amount={outputAmount}
          onTokenSelect={() => setSelectingFor('output')}
          balance={outputToken ? (tokenBalances[outputToken.address] || 0) / Math.pow(10, outputToken.decimals) : undefined}
          disabled
          showAddress={true}
        />

        {/* Loading indicator */}
        {quoteLoading && (
          <div className="flex items-center justify-center py-2">
            <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-sm text-gray-400">Finding best price...</span>
          </div>
        )}

        {/* Quote error */}
        {quoteError && !quoteLoading && (
          <p className="text-sm text-red-400 text-center py-2">{quoteError}</p>
        )}

        {/* Swap Details */}
        {quote && !quoteLoading && (
          <div className="mt-4">
            <SwapDetails
              quote={quote}
              inputToken={inputToken}
              outputToken={outputToken}
              slippageBps={slippageBps}
              onSlippageChange={setSlippageBps}
            />
          </div>
        )}

        {/* Swap Button */}
        <div className="mt-4">
          <SwapButton
            quote={quote}
            state={swapState}
            error={swapError}
            txSignature={txSignature}
            inputToken={inputToken}
            outputToken={outputToken}
            inputAmount={inputAmount}
            insufficientBalance={insufficientBalance}
            onSwap={executeSwap}
            onReset={resetSwap}
          />
        </div>
      </div>

      {/* Token Select Modal */}
      <TokenSelectModal
        isOpen={selectingFor !== null}
        onClose={() => setSelectingFor(null)}
        onSelect={handleTokenSelect}
        balances={tokenBalances}
        watchlistTokens={watchlistTokens}
        excludeToken={selectingFor === 'input' ? outputToken : inputToken}
      />
    </div>
  );
}
