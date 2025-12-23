'use client';

import { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { CHAINS } from '@/lib/constants';
import { isValidAddress } from '@/lib/utils';
import { Search, Plus, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const chainOptions = Object.entries(CHAINS).map(([key, chain]) => ({
  value: key,
  label: chain.name,
}));

export function QuickAddModal({ isOpen, onClose, onAdded }) {
  const [chain, setChain] = useState('SOLANA');
  const [contractAddress, setContractAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [addressError, setAddressError] = useState('');

  const handleAddressChange = (e) => {
    const address = e.target.value;
    setContractAddress(address);
    setAddressError('');

    if (address && !isValidAddress(address, chain)) {
      setAddressError(
        chain === 'SOLANA'
          ? 'Invalid Solana address format'
          : 'Invalid address format (expected 0x...)'
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!contractAddress || addressError) {
      toast.error('Please enter a valid contract address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress,
          chain,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add');
      }

      const data = await response.json();
      const tokenName = data.watchlistItem?.name || data.watchlistItem?.symbol || 'Token';
      toast.success(`${tokenName} added to watchlist`);
      setContractAddress('');
      onAdded?.();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setContractAddress('');
    setAddressError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Token to Watchlist"
      description="Paste a contract address to track any token"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Chain"
          options={chainOptions}
          value={chain}
          onChange={(e) => {
            setChain(e.target.value);
            if (contractAddress) {
              handleAddressChange({ target: { value: contractAddress } });
            }
          }}
        />

        <Input
          label="Contract Address"
          placeholder={chain === 'SOLANA' ? 'Token mint address...' : '0x...'}
          value={contractAddress}
          onChange={handleAddressChange}
          error={addressError}
          icon={Search}
        />

        <div className="flex items-center gap-2 text-xs text-gray-500 bg-dark-bg/50 rounded-lg p-3">
          <Sparkles className="w-4 h-4 text-brand-400 flex-shrink-0" />
          <span>Token name and symbol will be automatically detected</span>
        </div>
      </form>

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!contractAddress || !!addressError}
          icon={Plus}
        >
          {isLoading ? 'Adding...' : 'Add to Watchlist'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
