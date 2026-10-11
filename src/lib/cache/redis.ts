import Redis from "ioredis";

/**
 * AstreWork Enterprise In-Memory Cache Engine
 * -------------------------------------------
 * Designed with a Defensive Cache-Aside Architecture.
 * If Redis is offline or not configured, it gracefully degrades to an in-memory LRU store.
 * Cache failures NEVER crash API requests or interrupt user sessions.
 */

export interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string | string[]): Promise<void>;
  delPattern(pattern: string): Promise<void>;
  getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T>;
  mget<T>(keys: string[]): Promise<(T | null)[]>;
  mset(items: { key: string; value: unknown; ttlSeconds?: number }[]): Promise<void>;
  isAvailable(): boolean;
  status(): "redis" | "memory" | "disabled";
}

interface MemoryEntry {
  value: string;
  expiresAt: number | null;
}

// In-Memory Fallback Store with auto-expiration
class InMemoryCacheStore {
  private store = new Map<string, MemoryEntry>();
  private readonly maxEntries = 2000;

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return null;
    }
  }

  set(key: string, value: unknown, ttlSeconds?: number): void {
    if (this.store.size >= this.maxEntries) {
      // Evict oldest 10% of entries to keep memory bounded
      const keysToEvict = Array.from(this.store.keys()).slice(0, Math.floor(this.maxEntries * 0.1));
      for (const k of keysToEvict) this.store.delete(k);
    }

    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, {
      value: JSON.stringify(value),
      expiresAt,
    });
  }

  del(key: string | string[]): void {
    const keys = Array.isArray(key) ? key : [key];
    for (const k of keys) this.store.delete(k);
  }

  delPattern(pattern: string): void {
    // Simple wildcard matcher for pattern like "feed:*"
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const k of this.store.keys()) {
      if (regex.test(k)) this.store.delete(k);
    }
  }
}

class RedisCacheManager implements CacheClient {
  private redis: Redis | null = null;
  private memoryFallback = new InMemoryCacheStore();
  private isRedisConnected = false;
  private hasLoggedWarning = false;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 2000,
        retryStrategy: (times) => {
          if (times > 3) {
            if (!this.hasLoggedWarning) {
              console.warn("[CacheEngine] Redis unreachable after 3 retries. Operating in in-memory fallback mode.");
              this.hasLoggedWarning = true;
            }
            return null; // Stop retrying
          }
          return Math.min(times * 200, 1000);
        },
      });

      this.redis.on("connect", () => {
        this.isRedisConnected = true;
        this.hasLoggedWarning = false;
        console.log("[CacheEngine] Connected to Redis successfully.");
      });

      this.redis.on("ready", () => {
        this.isRedisConnected = true;
      });

      this.redis.on("error", (err) => {
        this.isRedisConnected = false;
        if (!this.hasLoggedWarning) {
          console.warn("[CacheEngine] Redis error (degrading to memory fallback):", err.message);
          this.hasLoggedWarning = true;
        }
      });

      this.redis.on("close", () => {
        this.isRedisConnected = false;
      });

      // Non-blocking initial connection attempt
      this.redis.connect().catch(() => {
        this.isRedisConnected = false;
      });
    } catch (err: unknown) {
      this.redis = null;
      this.isRedisConnected = false;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[CacheEngine] Failed to initialize Redis client:", msg);
    }
  }

  isAvailable(): boolean {
    return this.isRedisConnected;
  }

  status(): "redis" | "memory" | "disabled" {
    if (this.isRedisConnected) return "redis";
    return "memory";
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isRedisConnected && this.redis) {
      try {
        const raw = await this.redis.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      } catch (err) {
        console.warn(`[CacheEngine] Redis get('${key}') failed, checking memory fallback:`, err instanceof Error ? err.message : err);
      }
    }
    return this.memoryFallback.get<T>(key);
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);

    // Save to memory store as backup
    this.memoryFallback.set(key, value, ttlSeconds);

    if (this.isRedisConnected && this.redis) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.redis.set(key, serialized, "EX", ttlSeconds);
        } else {
          await this.redis.set(key, serialized);
        }
      } catch (err) {
        console.warn(`[CacheEngine] Redis set('${key}') failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  async del(key: string | string[]): Promise<void> {
    const keys = Array.isArray(key) ? key : [key];
    if (keys.length === 0) return;

    this.memoryFallback.del(keys);

    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.del(...keys);
      } catch (err) {
        console.warn("[CacheEngine] Redis del failed:", err instanceof Error ? err.message : err);
      }
    }
  }

  async delPattern(pattern: string): Promise<void> {
    this.memoryFallback.delPattern(pattern);

    if (this.isRedisConnected && this.redis) {
      try {
        // Safe SCAN stream to prevent blocking Redis event loop
        const stream = this.redis.scanStream({
          match: pattern,
          count: 100,
        });

        stream.on("data", (resultKeys: string[]) => {
          if (resultKeys.length > 0 && this.redis) {
            this.redis.del(...resultKeys).catch(() => {});
          }
        });
      } catch (err) {
        console.warn(`[CacheEngine] Redis delPattern('${pattern}') failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const fresh = await factory();
    // Non-blocking cache store
    this.set(key, fresh, ttlSeconds).catch(() => {});
    return fresh;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!keys || keys.length === 0) return [];

    if (this.isRedisConnected && this.redis) {
      try {
        const results = await this.redis.mget(...keys);
        return results.map((raw) => {
          if (!raw) return null;
          try {
            return JSON.parse(raw) as T;
          } catch {
            return null;
          }
        });
      } catch (err) {
        console.warn("[CacheEngine] Redis mget failed, falling back to memory:", err instanceof Error ? err.message : err);
      }
    }

    return keys.map((k) => this.memoryFallback.get<T>(k));
  }

  async mset(items: { key: string; value: unknown; ttlSeconds?: number }[]): Promise<void> {
    if (!items || items.length === 0) return;

    for (const item of items) {
      this.memoryFallback.set(item.key, item.value, item.ttlSeconds);
    }

    if (this.isRedisConnected && this.redis) {
      try {
        const pipeline = this.redis.pipeline();
        for (const item of items) {
          const serialized = JSON.stringify(item.value);
          if (item.ttlSeconds && item.ttlSeconds > 0) {
            pipeline.set(item.key, serialized, "EX", item.ttlSeconds);
          } else {
            pipeline.set(item.key, serialized);
          }
        }
        await pipeline.exec();
      } catch (err) {
        console.warn("[CacheEngine] Redis mset pipeline failed:", err instanceof Error ? err.message : err);
      }
    }
  }
}

// Global singleton for Next.js Fast Refresh & Node runtime
const globalForCache = globalThis as unknown as {
  astreworkCache: RedisCacheManager | undefined;
};

export const cache: CacheClient = globalForCache.astreworkCache ?? new RedisCacheManager();

if (process.env.NODE_ENV !== "production") {
  globalForCache.astreworkCache = cache as RedisCacheManager;
}
