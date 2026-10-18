import { db } from "@/lib/db";
import { PlatformSource } from "@prisma/client";

export interface ResolvedProviderConfig {
  status: "HEALTHY" | "DEGRADED" | "COOLDOWN";
  cardSelector?: string;
  titleSelector?: string;
  companySelector?: string;
  urlSelector?: string;
  apiEndpoint?: string;
  customHeaders?: Record<string, string>;
}

// In-memory cache with 5-minute TTL to avoid DB roundtrips on every scrape
const configCache = new Map<string, { config: ResolvedProviderConfig; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getProviderConfig(
  providerKey: PlatformSource,
  defaults: ResolvedProviderConfig
): Promise<ResolvedProviderConfig> {
  const now = Date.now();
  const cached = configCache.get(providerKey);
  if (cached && cached.expiresAt > now) {
    return cached.config;
  }

  try {
    const record = await db.providerConfig.findUnique({
      where: { providerKey },
    });

    if (!record) {
      configCache.set(providerKey, { config: defaults, expiresAt: now + CACHE_TTL_MS });
      return defaults;
    }

    let parsedHeaders: Record<string, string> | undefined;
    if (record.customHeaders) {
      try {
        parsedHeaders = JSON.parse(record.customHeaders);
      } catch {
        // ignore invalid json
      }
    }

    const resolved: ResolvedProviderConfig = {
      status: (record.status as ResolvedProviderConfig["status"]) || defaults.status,
      cardSelector: record.cardSelector || defaults.cardSelector,
      titleSelector: record.titleSelector || defaults.titleSelector,
      companySelector: record.companySelector || defaults.companySelector,
      urlSelector: record.urlSelector || defaults.urlSelector,
      apiEndpoint: record.apiEndpoint || defaults.apiEndpoint,
      customHeaders: parsedHeaders || defaults.customHeaders,
    };

    configCache.set(providerKey, { config: resolved, expiresAt: now + CACHE_TTL_MS });
    return resolved;
  } catch {
    return defaults;
  }
}

export async function updateProviderConfig(
  providerKey: PlatformSource,
  updates: Partial<ResolvedProviderConfig> & { lastHealedAt?: Date }
): Promise<void> {
  configCache.delete(providerKey); // Invalidate cache

  await db.providerConfig.upsert({
    where: { providerKey },
    create: {
      providerKey,
      status: updates.status || "HEALTHY",
      cardSelector: updates.cardSelector,
      titleSelector: updates.titleSelector,
      companySelector: updates.companySelector,
      urlSelector: updates.urlSelector,
      apiEndpoint: updates.apiEndpoint,
      customHeaders: updates.customHeaders ? JSON.stringify(updates.customHeaders) : null,
      lastHealedAt: updates.lastHealedAt || new Date(),
    },
    update: {
      ...(updates.status ? { status: updates.status } : {}),
      ...(updates.cardSelector !== undefined ? { cardSelector: updates.cardSelector } : {}),
      ...(updates.titleSelector !== undefined ? { titleSelector: updates.titleSelector } : {}),
      ...(updates.companySelector !== undefined ? { companySelector: updates.companySelector } : {}),
      ...(updates.urlSelector !== undefined ? { urlSelector: updates.urlSelector } : {}),
      ...(updates.apiEndpoint !== undefined ? { apiEndpoint: updates.apiEndpoint } : {}),
      ...(updates.customHeaders !== undefined ? { customHeaders: JSON.stringify(updates.customHeaders) } : {}),
      lastHealedAt: updates.lastHealedAt || new Date(),
    },
  });
}
