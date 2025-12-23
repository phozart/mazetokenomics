'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { CHAINS } from '@/lib/constants';
import { isValidAddress } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Shield,
  Zap,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';

const chainOptions = Object.entries(CHAINS).map(([key, chain]) => ({
  value: key,
  label: chain.name,
}));

const priorityOptions = [
  { value: 'LOW', label: 'Low Priority' },
  { value: 'NORMAL', label: 'Normal Priority' },
  { value: 'HIGH', label: 'High Priority' },
  { value: 'URGENT', label: 'Urgent' },
];

export default function NewTokenPage() {
  const router = useRouter();

  const [chain, setChain] = useState('ETHEREUM');
  const [contractAddress, setContractAddress] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [addressError, setAddressError] = useState('');

  const handleAddressChange = async (e) => {
    const address = e.target.value;
    setContractAddress(address);
    setTokenInfo(null);
    setAddressError('');

    if (address && !isValidAddress(address, chain)) {
      setAddressError(chain === 'SOLANA'
        ? 'Invalid Solana address format (expected base58)'
        : 'Invalid contract address format (expected 0x...)');
      return;
    }

    // Auto-lookup token info when valid address is entered
    if (isValidAddress(address, chain)) {
      setIsLookingUp(true);
      try {
        const response = await fetch(`/api/external/dexscreener?address=${address}`);
        if (response.ok) {
          const data = await response.json();
          if (data.pairs && data.pairs.length > 0) {
            const pair = data.pairs[0];
            setTokenInfo({
              name: pair.baseToken?.name,
              symbol: pair.baseToken?.symbol,
              priceUsd: pair.priceUsd,
              liquidity: pair.liquidity?.usd,
            });
          }
        }
      } catch (error) {
        console.error('Token lookup failed:', error);
      } finally {
        setIsLookingUp(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidAddress(contractAddress, chain)) {
      setAddressError('Please enter a valid contract address');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain,
          contractAddress,
          priority,
          notes,
          name: tokenInfo?.name,
          symbol: tokenInfo?.symbol,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit token');
      }

      const data = await response.json();
      toast.success('Token submitted for analysis');
      router.push(`/tokens/${data.id}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Header
        title="Submit Token for Analysis"
        description="Enter a contract address to start the analysis process"
      />

      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Token Details</CardTitle>
            <CardDescription>
              Provide the contract address and chain to begin automated security checks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Chain Selection */}
              <Select
                label="Blockchain"
                options={chainOptions}
                value={chain}
                onChange={(e) => {
                  setChain(e.target.value);
                  // Re-validate address when chain changes
                  if (contractAddress) {
                    const newChain = e.target.value;
                    if (!isValidAddress(contractAddress, newChain)) {
                      setAddressError(newChain === 'SOLANA'
                        ? 'Invalid Solana address format (expected base58)'
                        : 'Invalid contract address format (expected 0x...)');
                    } else {
                      setAddressError('');
                    }
                  }
                }}
                placeholder="Select blockchain"
              />

              {/* Contract Address */}
              <div>
                <Input
                  label="Contract Address"
                  placeholder={chain === 'SOLANA' ? 'e.g. EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' : '0x...'}
                  value={contractAddress}
                  onChange={handleAddressChange}
                  error={addressError}
                  icon={Search}
                />

                {/* Token Info Preview */}
                {isLookingUp && (
                  <div className="mt-3 flex items-center gap-2 text-gray-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Looking up token info...
                  </div>
                )}

                {tokenInfo && (
                  <div className="mt-3 p-4 bg-dark-bg rounded-lg border border-dark-border">
                    <div className="flex items-center gap-2 text-green-400 text-sm mb-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Token found
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Name:</span>{' '}
                        <span className="text-gray-200">{tokenInfo.name || 'Unknown'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Symbol:</span>{' '}
                        <span className="text-gray-200">{tokenInfo.symbol || 'Unknown'}</span>
                      </div>
                      {tokenInfo.priceUsd && (
                        <div>
                          <span className="text-gray-500">Price:</span>{' '}
                          <span className="text-gray-200">${parseFloat(tokenInfo.priceUsd).toFixed(6)}</span>
                        </div>
                      )}
                      {tokenInfo.liquidity && (
                        <div>
                          <span className="text-gray-500">Liquidity:</span>{' '}
                          <span className="text-gray-200">${parseFloat(tokenInfo.liquidity).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Priority */}
              <Select
                label="Priority"
                options={priorityOptions}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />

              {/* Notes */}
              <Textarea
                label="Notes (Optional)"
                placeholder="Any additional context about this token..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />

              {/* What happens next */}
              <div className="p-4 bg-brand-400/5 border border-brand-400/20 rounded-lg">
                <h4 className="text-sm font-medium text-brand-400 mb-3">
                  What happens next?
                </h4>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                    <span>Automated security checks run immediately (GoPlus, DEXScreener, Etherscan)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                    <span>Token is assigned to reviewers for manual verification</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                    <span>Final risk score is calculated from automatic (40%) + manual (60%) checks</span>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={!contractAddress || !!addressError}
                  icon={ArrowRight}
                >
                  Submit for Analysis
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
