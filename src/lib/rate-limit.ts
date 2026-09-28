interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * In-memory fixed-window limiter. Single-instance MVP: adequate for local and
 * single-container deploys. Swap for Redis/Upstash before running multi-region.
 */
export function rateLimit(key: string, limit = 10, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const bucket: Bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    return { ok: true, limit, remaining: limit - 1, resetAt: bucket.resetAt };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  return {
    ok: existing.count <= limit,
    limit,
    remaining,
    resetAt: existing.resetAt
  };
}

export function resetRateLimits() {
  buckets.clear();
}

export function clientKeyFromRequest(request: Request, scope: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'local';
  return `${scope}:${ip}`;
}
