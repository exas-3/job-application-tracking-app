type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type Entry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Entry>();

export function checkRateLimit(key: string, options: RateLimitOptions): boolean {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return false;
  }

  if (entry.count >= options.limit) {
    return true;
  }

  entry.count += 1;
  buckets.set(key, entry);
  return false;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export function getRateLimitKey(route: string, req: Request): string {
  return `${route}:${getClientIp(req)}`;
}
