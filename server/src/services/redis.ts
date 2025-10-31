/**
 * Redis Service
 * Pub/Sub for real-time collaboration across multiple server instances
 */

import { createClient, RedisClientType } from 'redis';
import { env } from '../env';

let redisClient: RedisClientType | null = null;
let redisSubscriber: RedisClientType | null = null;

const REDIS_URL = env.REDIS_URL || 'redis://localhost:6379';

export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  redisClient = createClient({ url: REDIS_URL });

  redisClient.on('error', (err) => {
    console.error('[redis] Client error:', err);
  });

  redisClient.on('connect', () => {
    console.log('[redis] Client connected');
  });

  await redisClient.connect();
  return redisClient;
}

export async function getRedisSubscriber(): Promise<RedisClientType> {
  if (redisSubscriber && redisSubscriber.isOpen) {
    return redisSubscriber;
  }

  redisSubscriber = createClient({ url: REDIS_URL });

  redisSubscriber.on('error', (err) => {
    console.error('[redis] Subscriber error:', err);
  });

  redisSubscriber.on('connect', () => {
    console.log('[redis] Subscriber connected');
  });

  await redisSubscriber.connect();
  return redisSubscriber;
}

export async function publishMessage(channel: string, message: any): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.publish(channel, JSON.stringify(message));
  } catch (error) {
    console.error('[redis] Publish error:', error);
  }
}

export async function subscribeToChannel(
  channel: string,
  callback: (message: any) => void
): Promise<void> {
  try {
    const subscriber = await getRedisSubscriber();
    
    await subscriber.subscribe(channel, (message) => {
      try {
        const parsed = JSON.parse(message);
        callback(parsed);
      } catch (error) {
        console.error('[redis] Message parse error:', error);
      }
    });

    console.log('[redis] Subscribed to channel:', channel);
  } catch (error) {
    console.error('[redis] Subscribe error:', error);
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  if (redisSubscriber) {
    await redisSubscriber.quit();
    redisSubscriber = null;
  }
}

