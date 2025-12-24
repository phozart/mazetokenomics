/**
 * Simple in-memory rate limiter for API routes
 * For production with multiple instances, use Redis instead
 */

const rateLimit = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimit.entries()) {
    if (now - data.resetTime > 0) {
      rateLimit.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if request should be rate limited
 * @param {string} identifier - Unique identifier (e.g., IP + route)
 * @param {number} limit - Max requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{ limited: boolean, remaining: number, resetIn: number }}
 */
export function checkRateLimit(identifier, limit = 100, windowMs = 60 * 1000) {
  const now = Date.now();
  const data = rateLimit.get(identifier);

  if (!data || now > data.resetTime) {
    // New window
    rateLimit.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { limited: false, remaining: limit - 1, resetIn: windowMs };
  }

  if (data.count >= limit) {
    return {
      limited: true,
      remaining: 0,
      resetIn: data.resetTime - now,
    };
  }

  data.count++;
  return {
    limited: false,
    remaining: limit - data.count,
    resetIn: data.resetTime - now,
  };
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Auth endpoints - stricter limits
  auth: { limit: 5, windowMs: 60 * 1000 }, // 5 attempts per minute

  // Standard API endpoints
  api: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute

  // Heavy operations (analysis, checks)
  heavy: { limit: 10, windowMs: 60 * 1000 }, // 10 per minute
};

/**
 * Get client identifier from request
 * @param {Request} request
 * @returns {string}
 */
export function getClientIdentifier(request) {
  // In production, you'd want to get the real IP from headers
  // like x-forwarded-for (if behind a proxy) or x-real-ip
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  // Fallback - in development or direct connections
  return 'unknown';
}
