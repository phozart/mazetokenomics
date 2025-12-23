import { clsx } from 'clsx';

// Combine class names
export function cn(...inputs) {
  return clsx(inputs);
}

// Format address for display
export function formatAddress(address, chars = 6) {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

// Format number with commas
export function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// Format currency
export function formatCurrency(num, decimals = 2) {
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// Format percentage
export function formatPercent(num, decimals = 1) {
  if (num === null || num === undefined) return '-';
  return `${formatNumber(num, decimals)}%`;
}

// Format date
export function formatDate(date) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

// Format date with time
export function formatDateTime(date) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(date) {
  if (!date) return '-';
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now - then) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(date);
}

// Validate blockchain address (EVM or Solana)
export function isValidAddress(address, chain = null) {
  if (!address || typeof address !== 'string') return false;

  // EVM address: 0x + 40 hex characters
  const isEVM = /^0x[a-fA-F0-9]{40}$/.test(address);

  // Solana address: 32-44 base58 characters (no 0, O, I, l)
  const isSolana = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);

  // If chain is specified, validate for that chain
  if (chain === 'SOLANA') {
    return isSolana;
  }
  if (chain && chain !== 'SOLANA') {
    return isEVM;
  }

  // Otherwise accept either format
  return isEVM || isSolana;
}

// Check if address is Solana format
export function isSolanaAddress(address) {
  if (!address || typeof address !== 'string') return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// Calculate risk level from score
export function getRiskLevel(score) {
  if (score === null || score === undefined) return null;
  if (score >= 80) return 'LOW';
  if (score >= 60) return 'MEDIUM';
  if (score >= 40) return 'HIGH';
  return 'EXTREME';
}

// Get risk level color
export function getRiskColor(riskLevel) {
  const colors = {
    LOW: 'success',
    MEDIUM: 'warning',
    HIGH: 'danger',
    EXTREME: 'danger',
  };
  return colors[riskLevel] || 'neutral';
}

// Get status display text
export function getStatusText(status) {
  const texts = {
    PENDING: 'Pending',
    AUTO_RUNNING: 'Running Checks',
    AUTO_COMPLETE: 'Awaiting Review',
    IN_REVIEW: 'In Review',
    REVIEW_COMPLETE: 'Review Complete',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    FLAGGED: 'Flagged',
  };
  return texts[status] || status;
}

// Sleep utility for async operations
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Debounce function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Generate random ID
export function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// Copy to clipboard
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

// Truncate string
export function truncate(str, maxLength) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}
