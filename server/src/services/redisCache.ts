/**
 * Upstash Redis Cache Service
 * Serverless Redis for hot data caching
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: 'https://emerging-bonefish-31758.upstash.io',
  token: 'AXwOAAIncDJjYWY0OGJmZWMyYTk0OTAyYjQ0N2Y2NDJhNzM1ZGJmM3AyMzE3NTg',
});

const CACHE_PREFIX = 'gsb:';
const DEFAULT_TTL = 3600; // 1 hour

/**
 * Cache design data (hot data)
 */
export async function cacheDesign(designId: string, data: any, ttl = DEFAULT_TTL): Promise<void> {
  const key = `${CACHE_PREFIX}design:${designId}`;
  await redis.set(key, JSON.stringify(data), { ex: ttl });
}

/**
 * Get cached design
 */
export async function getCachedDesign(designId: string): Promise<any | null> {
  const key = `${CACHE_PREFIX}design:${designId}`;
  const data = await redis.get(key);
  return data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;
}

/**
 * Delete cached design
 */
export async function deleteCachedDesign(designId: string): Promise<void> {
  const key = `${CACHE_PREFIX}design:${designId}`;
  await redis.del(key);
}

/**
 * Cache product data from Shopify
 */
export async function cacheProduct(productGid: string, data: any, ttl = 7200): Promise<void> {
  const key = `${CACHE_PREFIX}product:${productGid}`;
  await redis.set(key, JSON.stringify(data), { ex: ttl });
}

/**
 * Get cached product
 */
export async function getCachedProduct(productGid: string): Promise<any | null> {
  const key = `${CACHE_PREFIX}product:${productGid}`;
  const data = await redis.get(key);
  return data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;
}

/**
 * Track active design sessions (for analytics)
 */
export async function trackActiveSession(sessionId: string, designId: string): Promise<void> {
  const key = `${CACHE_PREFIX}session:${sessionId}`;
  await redis.set(key, designId, { ex: 86400 }); // 24 hours
}

/**
 * Get active sessions count
 */
export async function getActiveSessionsCount(): Promise<number> {
  const keys = await redis.keys(`${CACHE_PREFIX}session:*`);
  return keys.length;
}

/**
 * Rate limiting
 */
export async function checkRateLimit(identifier: string, limit = 100, window = 60): Promise<boolean> {
  const key = `${CACHE_PREFIX}ratelimit:${identifier}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, window);
  }
  
  return current <= limit;
}

export { redis };

