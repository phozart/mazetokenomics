'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut, PieChart } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function WalletButton() {
  const { publicKey, wallet, disconnect, connected, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const truncatedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : '';

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      toast.success('Address copied');
      setShowDropdown(false);
    }
  };

  const viewOnExplorer = () => {
    if (publicKey) {
      window.open(`https://solscan.io/account/${publicKey.toBase58()}`, '_blank');
      setShowDropdown(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowDropdown(false);
    toast.success('Wallet disconnected');
  };

  if (connecting) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 bg-dark-hover text-gray-400 rounded-lg text-sm font-medium"
      >
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        Connecting...
      </button>
    );
  }

  if (connected && publicKey) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-2 bg-dark-card border border-dark-border hover:border-brand-400/50 rounded-lg text-sm font-medium transition-colors"
        >
          {wallet?.adapter?.icon && (
            <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-5 h-5" />
          )}
          <span className="text-gray-200">{truncatedAddress}</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-dark-card border border-dark-border rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-dark-border">
              <p className="text-xs text-gray-500">Connected with</p>
              <p className="text-sm text-gray-200 font-medium">{wallet?.adapter?.name}</p>
            </div>
            <div className="p-1">
              <button
                onClick={() => {
                  router.push('/portfolio');
                  setShowDropdown(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-brand-400 hover:bg-brand-400/10 rounded-md transition-colors"
              >
                <PieChart className="w-4 h-4" />
                View Portfolio
              </button>
              <button
                onClick={copyAddress}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-dark-hover rounded-md transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy Address
              </button>
              <button
                onClick={viewOnExplorer}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-dark-hover rounded-md transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View on Solscan
              </button>
              <div className="border-t border-dark-border my-1" />
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-dark-hover rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
    >
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </button>
  );
}
