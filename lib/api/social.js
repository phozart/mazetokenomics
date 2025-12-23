// Social Media Verification Utilities
// Checks X (Twitter), Telegram, Website presence

/**
 * Verify social media presence from DEXScreener data
 * @param {Object} dexData - DEXScreener pair data
 * @returns {Object} Social verification results
 */
export function verifySocialPresence(dexData) {
  if (!dexData?.pairs?.[0]) return null;

  const pair = dexData.pairs[0];
  const info = pair.info || {};
  const socials = info.socials || [];
  const websites = info.websites || [];

  const hasTwitter = socials.some(s => s.type === 'twitter');
  const hasTelegram = socials.some(s => s.type === 'telegram');
  const hasDiscord = socials.some(s => s.type === 'discord');
  const hasWebsite = websites.length > 0;

  const checks = {
    HAS_TWITTER: {
      passed: hasTwitter,
      value: hasTwitter,
      details: hasTwitter
        ? `X: ${socials.find(s => s.type === 'twitter')?.url || 'Present'}`
        : 'No X account linked',
      severity: 'MEDIUM',
    },
    HAS_TELEGRAM: {
      passed: hasTelegram,
      value: hasTelegram,
      details: hasTelegram
        ? `Telegram: ${socials.find(s => s.type === 'telegram')?.url || 'Present'}`
        : 'No Telegram group linked',
      severity: 'LOW',
    },
    HAS_WEBSITE: {
      passed: hasWebsite,
      value: hasWebsite,
      details: hasWebsite
        ? `Website: ${websites[0]?.url || 'Present'}`
        : 'No website linked',
      severity: 'MEDIUM',
    },
    SOCIAL_SCORE: {
      passed: (hasTwitter ? 1 : 0) + (hasTelegram ? 1 : 0) + (hasWebsite ? 1 : 0) >= 2,
      value: (hasTwitter ? 1 : 0) + (hasTelegram ? 1 : 0) + (hasWebsite ? 1 : 0) + (hasDiscord ? 1 : 0),
      details: `Social presence: ${(hasTwitter ? 1 : 0) + (hasTelegram ? 1 : 0) + (hasWebsite ? 1 : 0) + (hasDiscord ? 1 : 0)}/4 channels`,
      severity: 'LOW',
    },
  };

  return {
    checks,
    socials: {
      twitter: socials.find(s => s.type === 'twitter')?.url,
      telegram: socials.find(s => s.type === 'telegram')?.url,
      discord: socials.find(s => s.type === 'discord')?.url,
    },
    websites: websites.map(w => w.url),
    hasMinimalPresence: hasTwitter || hasWebsite,
  };
}

/**
 * Check website security and age
 * @param {string} websiteUrl - Website URL
 * @returns {Promise<Object>} Website analysis
 */
export async function analyzeWebsite(websiteUrl) {
  if (!websiteUrl) return null;

  try {
    // Extract domain
    const url = new URL(websiteUrl);
    const domain = url.hostname;

    // Check if HTTPS
    const isHttps = url.protocol === 'https:';

    // Try to check if website is reachable
    let isReachable = false;
    try {
      const response = await fetch(websiteUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      isReachable = response.ok;
    } catch {
      isReachable = false;
    }

    return {
      domain,
      isHttps,
      isReachable,
      checks: {
        WEBSITE_HTTPS: {
          passed: isHttps,
          value: isHttps,
          details: isHttps ? 'Website uses HTTPS' : 'Website does NOT use HTTPS',
          severity: 'MEDIUM',
        },
        WEBSITE_REACHABLE: {
          passed: isReachable,
          value: isReachable,
          details: isReachable ? 'Website is reachable' : 'Website is not reachable',
          severity: 'LOW',
        },
      },
    };
  } catch (error) {
    console.error('Website analysis error:', error);
    return null;
  }
}

/**
 * Get token image/logo presence
 * @param {Object} tokenInfo - Token info from various sources
 * @returns {Object} Logo check
 */
export function checkTokenLogo(tokenInfo) {
  const hasLogo = !!(tokenInfo?.logoURI || tokenInfo?.image || tokenInfo?.logo);

  return {
    HAS_LOGO: {
      passed: hasLogo,
      value: hasLogo,
      details: hasLogo
        ? 'Token has logo/image'
        : 'Token has no logo - may indicate low effort project',
      severity: 'LOW',
    },
  };
}
