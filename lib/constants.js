// Chain configurations
export const CHAINS = {
  ETHEREUM: {
    id: 'ETHEREUM',
    name: 'Ethereum',
    chainId: 1,
    goplusChainId: '1',
    etherscanChainId: '1',
    dexscreenerChain: 'ethereum',
    moralisChain: 'eth',
    explorer: 'https://etherscan.io',
    color: '#627EEA',
  },
  BSC: {
    id: 'BSC',
    name: 'BNB Chain',
    chainId: 56,
    goplusChainId: '56',
    etherscanChainId: '56',
    dexscreenerChain: 'bsc',
    moralisChain: 'bsc',
    explorer: 'https://bscscan.com',
    color: '#F3BA2F',
  },
  POLYGON: {
    id: 'POLYGON',
    name: 'Polygon',
    chainId: 137,
    goplusChainId: '137',
    etherscanChainId: '137',
    dexscreenerChain: 'polygon',
    moralisChain: 'polygon',
    explorer: 'https://polygonscan.com',
    color: '#8247E5',
  },
  ARBITRUM: {
    id: 'ARBITRUM',
    name: 'Arbitrum',
    chainId: 42161,
    goplusChainId: '42161',
    etherscanChainId: '42161',
    dexscreenerChain: 'arbitrum',
    moralisChain: 'arbitrum',
    explorer: 'https://arbiscan.io',
    color: '#28A0F0',
  },
  BASE: {
    id: 'BASE',
    name: 'Base',
    chainId: 8453,
    goplusChainId: '8453',
    etherscanChainId: '8453',
    dexscreenerChain: 'base',
    moralisChain: 'base',
    explorer: 'https://basescan.org',
    color: '#0052FF',
  },
  OPTIMISM: {
    id: 'OPTIMISM',
    name: 'Optimism',
    chainId: 10,
    goplusChainId: '10',
    etherscanChainId: '10',
    dexscreenerChain: 'optimism',
    moralisChain: 'optimism',
    explorer: 'https://optimistic.etherscan.io',
    color: '#FF0420',
  },
  AVALANCHE: {
    id: 'AVALANCHE',
    name: 'Avalanche',
    chainId: 43114,
    goplusChainId: '43114',
    etherscanChainId: '43114',
    dexscreenerChain: 'avalanche',
    moralisChain: 'avalanche',
    explorer: 'https://snowtrace.io',
    color: '#E84142',
  },
  SOLANA: {
    id: 'SOLANA',
    name: 'Solana',
    chainId: null, // Solana uses different addressing
    goplusChainId: 'solana',
    etherscanChainId: null, // No Etherscan for Solana
    dexscreenerChain: 'solana',
    moralisChain: 'solana',
    explorer: 'https://solscan.io',
    color: '#9945FF',
  },
};

// Automatic check configurations
export const AUTO_CHECK_CONFIG = {
  // GoPlus Security Checks
  HONEYPOT_DETECTION: {
    name: 'Honeypot Detection',
    description: 'Checks if the token is a honeypot scam',
    severity: 'CRITICAL',
    weight: 1.0,
    source: 'goplus',
  },
  BUY_TAX_ANALYSIS: {
    name: 'Buy Tax Analysis',
    description: 'Analyzes buy tax percentage',
    severity: 'HIGH',
    weight: 0.75,
    source: 'goplus',
    threshold: 10, // Flag if > 10%
  },
  SELL_TAX_ANALYSIS: {
    name: 'Sell Tax Analysis',
    description: 'Analyzes sell tax percentage',
    severity: 'HIGH',
    weight: 0.75,
    source: 'goplus',
    threshold: 10,
  },
  MINT_FUNCTION: {
    name: 'Mint Function',
    description: 'Checks if contract has mint function',
    severity: 'HIGH',
    weight: 0.75,
    source: 'goplus',
  },
  PROXY_CONTRACT: {
    name: 'Proxy Contract',
    description: 'Checks if contract is a proxy',
    severity: 'MEDIUM',
    weight: 0.5,
    source: 'goplus',
  },
  OWNER_CHANGE_CAPABILITY: {
    name: 'Owner Change Capability',
    description: 'Checks if ownership can be transferred',
    severity: 'HIGH',
    weight: 0.75,
    source: 'goplus',
  },
  TRADING_COOLDOWN: {
    name: 'Trading Cooldown',
    description: 'Checks for trading cooldown restrictions',
    severity: 'MEDIUM',
    weight: 0.5,
    source: 'goplus',
  },
  BLACKLIST_FUNCTION: {
    name: 'Blacklist Function',
    description: 'Checks if contract can blacklist addresses',
    severity: 'HIGH',
    weight: 0.75,
    source: 'goplus',
  },
  HIDDEN_OWNER: {
    name: 'Hidden Owner',
    description: 'Checks for hidden owner functionality',
    severity: 'CRITICAL',
    weight: 1.0,
    source: 'goplus',
  },
  EXTERNAL_CALL_RISK: {
    name: 'External Call Risk',
    description: 'Checks for risky external calls',
    severity: 'HIGH',
    weight: 0.75,
    source: 'goplus',
  },

  // Etherscan Checks
  CONTRACT_VERIFIED: {
    name: 'Contract Verified',
    description: 'Checks if contract source is verified',
    severity: 'CRITICAL',
    weight: 1.0,
    source: 'etherscan',
  },
  CONTRACT_AGE: {
    name: 'Contract Age',
    description: 'Checks contract deployment age',
    severity: 'MEDIUM',
    weight: 0.5,
    source: 'etherscan',
    threshold: 30, // Days
  },
  CREATOR_ANALYSIS: {
    name: 'Creator Analysis',
    description: 'Analyzes contract creator history',
    severity: 'HIGH',
    weight: 0.75,
    source: 'etherscan',
  },

  // DEXScreener Checks
  LIQUIDITY_DEPTH: {
    name: 'Liquidity Depth',
    description: 'Checks available liquidity',
    severity: 'HIGH',
    weight: 0.75,
    source: 'dexscreener',
    threshold: 10000, // $10k minimum
  },
  TRADING_VOLUME_24H: {
    name: '24h Trading Volume',
    description: 'Checks 24-hour trading volume',
    severity: 'MEDIUM',
    weight: 0.5,
    source: 'dexscreener',
    threshold: 1000, // $1k minimum
  },
  PRICE_IMPACT: {
    name: 'Price Impact',
    description: 'Analyzes price impact for trades',
    severity: 'MEDIUM',
    weight: 0.5,
    source: 'dexscreener',
  },

  // Holder Checks
  HOLDER_COUNT: {
    name: 'Holder Count',
    description: 'Number of unique holders',
    severity: 'MEDIUM',
    weight: 0.5,
    source: 'goplus',
    threshold: 100, // Minimum holders
  },
  TOP_HOLDER_CONCENTRATION: {
    name: 'Top Holder Concentration',
    description: 'Percentage held by top 10 holders',
    severity: 'HIGH',
    weight: 0.75,
    source: 'moralis',
    threshold: 50, // Flag if > 50%
  },
  WHALE_DISTRIBUTION: {
    name: 'Whale Distribution',
    description: 'Distribution among whale wallets',
    severity: 'HIGH',
    weight: 0.75,
    source: 'moralis',
  },

  // Solana-Specific Checks (RugCheck)
  MINT_AUTHORITY: {
    name: 'Mint Authority',
    description: 'Checks if mint authority is revoked (Solana)',
    severity: 'CRITICAL',
    weight: 1.0,
    source: 'rugcheck',
  },
  FREEZE_AUTHORITY: {
    name: 'Freeze Authority',
    description: 'Checks if freeze authority is revoked (Solana)',
    severity: 'HIGH',
    weight: 0.75,
    source: 'rugcheck',
  },
  LP_LOCKED: {
    name: 'LP Locked',
    description: 'Percentage of liquidity pool locked (Solana)',
    severity: 'HIGH',
    weight: 0.75,
    source: 'rugcheck',
    threshold: 80, // Flag if < 80% locked
  },
  MUTABLE_METADATA: {
    name: 'Mutable Metadata',
    description: 'Checks if token metadata can be changed (Solana)',
    severity: 'MEDIUM',
    weight: 0.5,
    source: 'rugcheck',
  },
  RUGCHECK_SCORE: {
    name: 'RugCheck Score',
    description: 'Overall security score from RugCheck (Solana)',
    severity: 'CRITICAL',
    weight: 1.0,
    source: 'rugcheck',
    threshold: 500, // 0-1000 scale
  },

  // Jupiter Verification (Solana)
  JUPITER_VERIFIED: {
    name: 'Jupiter Verified',
    description: 'Token is on Jupiter verified list (Solana)',
    severity: 'HIGH',
    weight: 0.75,
    source: 'jupiter',
  },

  // Social/Presence Checks
  HAS_TWITTER: {
    name: 'X (Twitter) Presence',
    description: 'Project has X account linked',
    severity: 'MEDIUM',
    weight: 0.5,
    source: 'social',
  },
  HAS_TELEGRAM: {
    name: 'Telegram Presence',
    description: 'Project has Telegram group linked',
    severity: 'LOW',
    weight: 0.25,
    source: 'social',
  },
  HAS_WEBSITE: {
    name: 'Website Presence',
    description: 'Project has official website',
    severity: 'MEDIUM',
    weight: 0.5,
    source: 'social',
  },
  SOCIAL_SCORE: {
    name: 'Social Score',
    description: 'Overall social media presence score',
    severity: 'LOW',
    weight: 0.25,
    source: 'social',
  },

  // Advanced Holder Analysis - Basic Checks
  TOP_HOLDER_WALLET_AGE: {
    name: 'Top Holder Wallet Age',
    description: 'Checks if top holders are using fresh wallets (potential bots/snipers)',
    severity: 'HIGH',
    weight: 0.75,
    source: 'holder_analysis',
    threshold: 7, // Days - flag if wallet is younger than 7 days
  },
  CONNECTED_WALLETS: {
    name: 'Connected Wallets',
    description: 'Detects if top holders share funding sources (coordinated buying)',
    severity: 'CRITICAL',
    weight: 1.0,
    source: 'holder_analysis',
    threshold: 30, // Flag if >30% of top holders are connected
  },
  WASH_TRADING_DETECTION: {
    name: 'Wash Trading Detection',
    description: 'Identifies suspicious trading patterns between related wallets',
    severity: 'CRITICAL',
    weight: 1.0,
    source: 'holder_analysis',
    threshold: 20, // Flag if >20% of volume appears to be wash trading
  },

  // Advanced Holder Analysis - Concentration Metrics
  GINI_COEFFICIENT: {
    name: 'Gini Coefficient',
    description: 'Measures holder concentration inequality (0=equal, 1=one holder owns all)',
    severity: 'HIGH',
    weight: 0.75,
    source: 'holder_analysis',
    threshold: 0.8, // Flag if > 0.8 (very concentrated)
  },
  NAKAMOTO_COEFFICIENT: {
    name: 'Nakamoto Coefficient',
    description: 'Minimum wallets needed to control 51% of supply',
    severity: 'HIGH',
    weight: 0.75,
    source: 'holder_analysis',
    threshold: 5, // Flag if < 5 wallets can control majority
  },
  EFFECTIVE_HOLDER_COUNT: {
    name: 'Effective Holder Count',
    description: 'Adjusted holder count accounting for coordinated wallets',
    severity: 'HIGH',
    weight: 0.75,
    source: 'holder_analysis',
    threshold: 10, // Flag if < 10 effective holders
  },

  // Advanced Holder Analysis - Risk Scores
  SYBIL_SCORE: {
    name: 'Sybil Attack Score',
    description: 'Probability that holders are fake/coordinated (funding overlap, timing, behavior)',
    severity: 'CRITICAL',
    weight: 1.0,
    source: 'holder_analysis',
    threshold: 60, // Flag if > 60% probability
  },
  INSIDER_SCORE: {
    name: 'Insider Detection Score',
    description: 'Likelihood of insider accumulation (pre-launch buyers, deployer connections)',
    severity: 'CRITICAL',
    weight: 1.0,
    source: 'holder_analysis',
    threshold: 50, // Flag if > 50% likelihood
  },
  EXIT_RISK_SCORE: {
    name: 'Exit Risk Score',
    description: 'Risk of large holder liquidation causing severe price impact',
    severity: 'HIGH',
    weight: 0.75,
    source: 'holder_analysis',
    threshold: 70, // Flag if > 70% exit risk
  },
  SMART_MONEY_RATIO: {
    name: 'Smart Money Ratio',
    description: 'Percentage of holders with established wallet history',
    severity: 'MEDIUM',
    weight: 0.5,
    source: 'holder_analysis',
    threshold: 20, // Flag if < 20% smart money
  },

  // Advanced Holder Analysis - Temporal Patterns
  COORDINATED_BUYING: {
    name: 'Coordinated Buying Detection',
    description: 'Detects synchronized purchase patterns within short time windows',
    severity: 'HIGH',
    weight: 0.75,
    source: 'holder_analysis',
    threshold: 25, // Flag if > 25% of buys are coordinated
  },
  SNIPER_ACTIVITY: {
    name: 'Sniper Bot Activity',
    description: 'Identifies first-block/first-minute purchase bots',
    severity: 'MEDIUM',
    weight: 0.5,
    source: 'holder_analysis',
    threshold: 5, // Flag if > 5 sniper wallets detected
  },
  HOLDING_DURATIONS: {
    name: 'Holding Duration Analysis',
    description: 'Analyzes diamond hands vs paper hands ratio among holders',
    severity: 'LOW',
    weight: 0.25,
    source: 'holder_analysis',
    threshold: 30, // Flag if < 30% are long-term holders
  },

  // Advanced Holder Analysis - Funding Chain
  FUNDING_CHAIN_DEPTH: {
    name: 'Funding Chain Analysis',
    description: 'Deep trace of holder funding sources (identifies mixers, common funders)',
    severity: 'HIGH',
    weight: 0.75,
    source: 'holder_analysis',
  },
};

// Manual check configurations
export const MANUAL_CHECK_CONFIG = {
  TEAM_KYC: {
    name: 'Team KYC/Doxxed',
    description: 'Verify team identity and background',
    severity: 'CRITICAL',
    weight: 1.0,
    guidelines: [
      'Check LinkedIn profiles',
      'Verify previous project history',
      'Cross-reference with KYC providers if available',
    ],
  },
  AUDIT_REVIEW: {
    name: 'Audit Review',
    description: 'Review smart contract audit reports',
    severity: 'CRITICAL',
    weight: 1.0,
    guidelines: [
      'Verify audit is from reputable firm (Certik, Hacken, etc.)',
      'Check all findings have been addressed',
      'Verify audit is for correct contract version',
    ],
  },
  TOKENOMICS_ANALYSIS: {
    name: 'Tokenomics Analysis',
    description: 'Analyze token distribution and economics',
    severity: 'HIGH',
    weight: 0.75,
    guidelines: [
      'Review token allocation percentages',
      'Check vesting schedules',
      'Analyze unlock events',
    ],
  },
  WHITEPAPER_REVIEW: {
    name: 'Whitepaper Review',
    description: 'Review project whitepaper quality',
    severity: 'MEDIUM',
    weight: 0.5,
    guidelines: [
      'Check for clear use case',
      'Verify technical feasibility',
      'Look for plagiarism',
    ],
  },
  ROADMAP_ASSESSMENT: {
    name: 'Roadmap Assessment',
    description: 'Assess project roadmap and milestones',
    severity: 'LOW',
    weight: 0.25,
    guidelines: [
      'Check milestone realism',
      'Verify past milestone completion',
      'Assess team capability',
    ],
  },
  COMMUNITY_ANALYSIS: {
    name: 'Community Analysis',
    description: 'Analyze community engagement and authenticity',
    severity: 'MEDIUM',
    weight: 0.5,
    guidelines: [
      'Check social media follower authenticity',
      'Review Discord/Telegram activity',
      'Look for bot activity indicators',
    ],
  },
  PARTNERSHIP_VERIFICATION: {
    name: 'Partnership Verification',
    description: 'Verify claimed partnerships',
    severity: 'MEDIUM',
    weight: 0.5,
    guidelines: [
      'Cross-reference partnership announcements',
      'Contact partners if possible',
      'Check for fake partnership claims',
    ],
  },
  LEGAL_COMPLIANCE: {
    name: 'Legal Compliance',
    description: 'Review regulatory compliance status',
    severity: 'HIGH',
    weight: 0.75,
    guidelines: [
      'Check jurisdiction considerations',
      'Review terms of service',
      'Assess securities law implications',
    ],
  },
  LIQUIDITY_LOCK_VERIFY: {
    name: 'Liquidity Lock Verification',
    description: 'Manually verify liquidity lock status',
    severity: 'HIGH',
    weight: 0.75,
    guidelines: [
      'Check Unicrypt/Team Finance locks',
      'Verify lock duration',
      'Confirm lock cannot be withdrawn early',
    ],
  },
  HISTORICAL_BEHAVIOR: {
    name: 'Historical Behavior',
    description: 'Review team\'s historical project behavior',
    severity: 'HIGH',
    weight: 0.75,
    guidelines: [
      'Search for previous project history',
      'Check for rug pull associations',
      'Review previous token performance',
    ],
  },
};

// Scoring thresholds
export const RISK_THRESHOLDS = {
  LOW: 80,    // Score >= 80
  MEDIUM: 60, // Score >= 60
  HIGH: 40,   // Score >= 40
  EXTREME: 0, // Score < 40
};

// Status colors for UI
export const STATUS_COLORS = {
  PENDING: 'neutral',
  AUTO_RUNNING: 'info',
  AUTO_COMPLETE: 'info',
  IN_REVIEW: 'warning',
  REVIEW_COMPLETE: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  FLAGGED: 'danger',
};

// Priority colors
export const PRIORITY_COLORS = {
  LOW: 'neutral',
  NORMAL: 'info',
  HIGH: 'warning',
  URGENT: 'danger',
};

// Severity weights for score calculation
export const SEVERITY_WEIGHTS = {
  CRITICAL: 1.0,
  HIGH: 0.75,
  MEDIUM: 0.5,
  LOW: 0.25,
};
