import {
  formatAddress,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatDate,
  isValidAddress,
  isSolanaAddress,
  getRiskLevel,
  getRiskColor,
  getStatusText,
  truncate,
  cn,
} from '@/lib/utils';

describe('Utils', () => {
  describe('formatAddress', () => {
    it('should format EVM address correctly', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      expect(formatAddress(address)).toBe('0x1234...5678');
    });

    it('should format with custom char count', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      expect(formatAddress(address, 10)).toBe('0x12345678...5678');
    });

    it('should return empty string for null/undefined', () => {
      expect(formatAddress(null)).toBe('');
      expect(formatAddress(undefined)).toBe('');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000.00');
      expect(formatNumber(1000000)).toBe('1,000,000.00');
    });

    it('should handle decimal places', () => {
      expect(formatNumber(1234.5678, 4)).toBe('1,234.5678');
      expect(formatNumber(1234.5, 0)).toBe('1,235');
    });

    it('should return dash for null/undefined', () => {
      expect(formatNumber(null)).toBe('-');
      expect(formatNumber(undefined)).toBe('-');
    });
  });

  describe('formatCurrency', () => {
    it('should format as USD currency', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should return dash for null/undefined', () => {
      expect(formatCurrency(null)).toBe('-');
      expect(formatCurrency(undefined)).toBe('-');
    });
  });

  describe('formatPercent', () => {
    it('should format as percentage', () => {
      expect(formatPercent(50)).toBe('50.0%');
      expect(formatPercent(33.333, 2)).toBe('33.33%');
    });

    it('should return dash for null/undefined', () => {
      expect(formatPercent(null)).toBe('-');
    });
  });

  describe('isValidAddress', () => {
    it('should validate EVM addresses', () => {
      expect(isValidAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
      expect(isValidAddress('0xInvalidAddress')).toBe(false);
    });

    it('should validate Solana addresses', () => {
      expect(isValidAddress('11111111111111111111111111111111')).toBe(true);
      expect(isValidAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(true);
    });

    it('should validate for specific chain', () => {
      expect(isValidAddress('0x1234567890abcdef1234567890abcdef12345678', 'ETHEREUM')).toBe(true);
      expect(isValidAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'SOLANA')).toBe(true);
      expect(isValidAddress('0x1234567890abcdef1234567890abcdef12345678', 'SOLANA')).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(isValidAddress(null)).toBe(false);
      expect(isValidAddress('')).toBe(false);
      expect(isValidAddress(123)).toBe(false);
    });
  });

  describe('isSolanaAddress', () => {
    it('should identify Solana addresses', () => {
      expect(isSolanaAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(true);
      expect(isSolanaAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(false);
    });
  });

  describe('getRiskLevel', () => {
    it('should return correct risk level based on score', () => {
      expect(getRiskLevel(90)).toBe('LOW');
      expect(getRiskLevel(80)).toBe('LOW');
      expect(getRiskLevel(70)).toBe('MEDIUM');
      expect(getRiskLevel(60)).toBe('MEDIUM');
      expect(getRiskLevel(50)).toBe('HIGH');
      expect(getRiskLevel(30)).toBe('EXTREME');
    });

    it('should return null for null/undefined', () => {
      expect(getRiskLevel(null)).toBe(null);
      expect(getRiskLevel(undefined)).toBe(null);
    });
  });

  describe('getRiskColor', () => {
    it('should return correct color for risk level', () => {
      expect(getRiskColor('LOW')).toBe('success');
      expect(getRiskColor('MEDIUM')).toBe('warning');
      expect(getRiskColor('HIGH')).toBe('danger');
      expect(getRiskColor('EXTREME')).toBe('danger');
      expect(getRiskColor('UNKNOWN')).toBe('neutral');
    });
  });

  describe('getStatusText', () => {
    it('should return human-readable status text', () => {
      expect(getStatusText('PENDING')).toBe('Pending');
      expect(getStatusText('AUTO_RUNNING')).toBe('Running Checks');
      expect(getStatusText('APPROVED')).toBe('Approved');
      expect(getStatusText('REJECTED')).toBe('Rejected');
    });

    it('should return original status for unknown values', () => {
      expect(getStatusText('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('This is a long string', 10)).toBe('This is a ...');
    });

    it('should not truncate short strings', () => {
      expect(truncate('Short', 10)).toBe('Short');
    });

    it('should handle empty/null strings', () => {
      expect(truncate(null, 10)).toBe('');
      expect(truncate('', 10)).toBe('');
    });
  });

  describe('cn', () => {
    it('should combine class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
      expect(cn('class1', false && 'class2', 'class3')).toBe('class1 class3');
    });
  });
});
