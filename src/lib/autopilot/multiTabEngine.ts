/**
 * multiTabEngine.ts
 * -----------------------------------------------------------------------------
 * AstrePilot Pillar E: Multi-Tab Application Synchronization & Telemetry Engine
 *
 * Implements:
 * 1. Active Fill Lock concurrency primitives (mutual exclusion across tabs)
 * 2. Tab Heartbeat & TTL expiration management
 * 3. Closed-tab lock pruning and cleanup
 * 4. Pre-flight duplicate application detection heuristics
 * 5. Cross-tab BroadcastChannel message formatting
 * -----------------------------------------------------------------------------
 */

import { normalizeApplicationUrl } from "@/lib/exportEngine";

export interface TabLockRecord {
  lockId: string;
  tabId: number | string;
  canonicalUrl: string;
  company: string;
  jobTitle: string;
  lockedAt: number;
  lastHeartbeat: number;
  expiresAt: number;
}

export interface AcquireLockRequest {
  tabId: number | string;
  siteUrl: string;
  company?: string;
  jobTitle?: string;
}

export interface AcquireLockResult {
  success: boolean;
  lock?: TabLockRecord;
  error?: string;
}

export type SyncEventType =
  | "FILL_LOCK_ACQUIRED"
  | "FILL_LOCK_RELEASED"
  | "APPLICATION_DRAFT_LOGGED"
  | "APPLICATION_CONFIRMED"
  | "VAULT_ENTRY_SAVED"
  | "APPLICATION_STATUS_UPDATED";

export interface SyncMessage<T = any> {
  type: SyncEventType;
  senderTabId?: number | string;
  timestamp: number;
  payload: T;
}

export interface ExistingApplicationSummary {
  id: string;
  company: string;
  title: string;
  status: string;
  confirmed?: boolean;
  appliedDate?: string;
  appliedAtIso?: string;
  canonicalUrl?: string;
  jobUrl?: string;
}

export const DEFAULT_LOCK_TTL_MS = 45000; // 45 seconds safety window
export const HEARTBEAT_INTERVAL_MS = 10000; // 10 seconds

/**
 * Creates a unique identifier for a lock based on canonical URL or company + title.
 */
export function getLockKey(canonicalUrl: string, company = "", jobTitle = ""): string {
  const normUrl = normalizeApplicationUrl(canonicalUrl);
  if (normUrl && normUrl.length > 8 && !normUrl.includes("localhost") && !normUrl.includes("testbench")) {
    return `url:${normUrl.toLowerCase()}`;
  }
  const cleanCompany = company.trim().toLowerCase();
  const cleanTitle = jobTitle.trim().toLowerCase();
  if (cleanCompany) {
    return `job:${cleanCompany}:${cleanTitle}`;
  }
  return `url:${normUrl || "generic"}`;
}

/**
 * Evaluates whether a given lock has expired.
 */
export function isLockExpired(lock: TabLockRecord, now = Date.now()): boolean {
  if (!lock) return true;
  return now >= lock.expiresAt;
}

/**
 * Attempts to acquire an active fill lock for a tab.
 * If another live tab already holds the lock and it hasn't expired, acquisition is rejected.
 */
export function acquireTabLock(
  locks: Map<string, TabLockRecord>,
  req: AcquireLockRequest,
  ttlMs = DEFAULT_LOCK_TTL_MS,
  now = Date.now()
): AcquireLockResult {
  if (!req || req.tabId == null) {
    return { success: false, error: "Missing tab identifier" };
  }

  const canonicalUrl = normalizeApplicationUrl(req.siteUrl || "");
  const company = (req.company || "").trim();
  const jobTitle = (req.jobTitle || "").trim();
  const key = getLockKey(canonicalUrl, company, jobTitle);

  const existing = locks.get(key);

  if (existing) {
    // If expired, or if re-acquired by the EXACT same tab, allow refresh
    const isSameTab = String(existing.tabId) === String(req.tabId);
    if (!isLockExpired(existing, now) && !isSameTab) {
      return {
        success: false,
        lock: existing,
        error: `Active fill in progress in another tab (Tab #${existing.tabId})`,
      };
    }
  }

  const newLock: TabLockRecord = {
    lockId: `lock_${now}_${Math.random().toString(36).substring(2, 8)}`,
    tabId: req.tabId,
    canonicalUrl,
    company,
    jobTitle,
    lockedAt: now,
    lastHeartbeat: now,
    expiresAt: now + ttlMs,
  };

  locks.set(key, newLock);
  return { success: true, lock: newLock };
}

/**
 * Extends the TTL of an existing lock owned by the specified tab.
 */
export function refreshTabLockHeartbeat(
  locks: Map<string, TabLockRecord>,
  tabId: number | string,
  siteUrl: string,
  company = "",
  jobTitle = "",
  ttlMs = DEFAULT_LOCK_TTL_MS,
  now = Date.now()
): boolean {
  const canonicalUrl = normalizeApplicationUrl(siteUrl || "");
  const key = getLockKey(canonicalUrl, company, jobTitle);
  const existing = locks.get(key);

  if (!existing) return false;
  if (String(existing.tabId) !== String(tabId)) return false;

  existing.lastHeartbeat = now;
  existing.expiresAt = now + ttlMs;
  locks.set(key, existing);
  return true;
}

/**
 * Releases a lock held by a tab.
 */
export function releaseTabLock(
  locks: Map<string, TabLockRecord>,
  tabId: number | string,
  siteUrl?: string,
  company = "",
  jobTitle = ""
): boolean {
  if (siteUrl || company) {
    const canonicalUrl = normalizeApplicationUrl(siteUrl || "");
    const key = getLockKey(canonicalUrl, company, jobTitle);
    const existing = locks.get(key);
    if (existing && String(existing.tabId) === String(tabId)) {
      locks.delete(key);
      return true;
    }
  }

  // Fallback: sweep all locks held by this tabId
  let releasedAny = false;
  for (const [k, lock] of locks.entries()) {
    if (String(lock.tabId) === String(tabId)) {
      locks.delete(k);
      releasedAny = true;
    }
  }
  return releasedAny;
}

/**
 * Prunes expired locks from the in-memory map.
 */
export function pruneExpiredLocks(
  locks: Map<string, TabLockRecord>,
  now = Date.now()
): number {
  let pruned = 0;
  for (const [k, lock] of locks.entries()) {
    if (isLockExpired(lock, now)) {
      locks.delete(k);
      pruned++;
    }
  }
  return pruned;
}

/**
 * Evaluates whether a target job application already exists in the candidate's portfolio.
 * Matches by canonical URL first, and falls back to (company + title) fuzzy matching.
 */
export function isDuplicateApplication(
  existingApps: ExistingApplicationSummary[],
  targetUrl: string,
  targetCompany = "",
  targetTitle = ""
): { isDuplicate: boolean; matchedApp: ExistingApplicationSummary | null; matchReason?: string } {
  if (!existingApps || existingApps.length === 0) {
    return { isDuplicate: false, matchedApp: null };
  }

  const cleanTargetUrl = normalizeApplicationUrl(targetUrl || "");
  const cleanTargetCompany = targetCompany.trim().toLowerCase();
  const cleanTargetTitle = targetTitle.trim().toLowerCase().replace(/\bengineer\b/g, "developer");

  // 1. Direct Canonical URL match
  if (cleanTargetUrl && cleanTargetUrl.length > 10) {
    const urlMatch = existingApps.find((app) => {
      const appUrl = normalizeApplicationUrl(app.canonicalUrl || app.jobUrl || "");
      return appUrl && appUrl === cleanTargetUrl;
    });
    if (urlMatch) {
      return { isDuplicate: true, matchedApp: urlMatch, matchReason: "CANONICAL_URL_MATCH" };
    }
  }

  // 2. Company & Title match
  if (cleanTargetCompany) {
    const compMatch = existingApps.find((app) => {
      const appComp = (app.company || "").trim().toLowerCase();
      const appTitle = (app.title || "").trim().toLowerCase().replace(/\bengineer\b/g, "developer");

      const companyMatches =
        appComp === cleanTargetCompany ||
        appComp.includes(cleanTargetCompany) ||
        cleanTargetCompany.includes(appComp);

      if (!companyMatches) return false;

      // Title match or similar specialization
      if (!cleanTargetTitle || !appTitle) return true;
      return (
        appTitle === cleanTargetTitle ||
        appTitle.includes(cleanTargetTitle) ||
        cleanTargetTitle.includes(appTitle)
      );
    });

    if (compMatch) {
      return { isDuplicate: true, matchedApp: compMatch, matchReason: "COMPANY_TITLE_MATCH" };
    }
  }

  return { isDuplicate: false, matchedApp: null };
}

/**
 * Creates a standard typed synchronization event for BroadcastChannel.
 */
export function formatSyncMessage<T>(
  type: SyncEventType,
  payload: T,
  senderTabId?: number | string
): SyncMessage<T> {
  return {
    type,
    senderTabId,
    timestamp: Date.now(),
    payload,
  };
}
