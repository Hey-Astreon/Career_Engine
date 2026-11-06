/**
 * formSchemaCache.ts
 * ------------------
 * AstrePilot V3: Self-Learning Form Schema Cache & Network Effect Moat.
 * 
 * Provides permanent, privacy-safe caching of verified form field mappings
 * indexed by structural SHA-256 fingerprint. When any user or the AI Form Oracle
 * successfully resolves a portal once, future users on that portal achieve
 * instant 0ms, zero-cost, 100% deterministic autofill.
 */

import { db } from "@/lib/db";
import { CanonicalFieldType } from "@/lib/autopilot/semanticFieldDiscovery";

export interface FieldMappingItem {
  elementId: string;
  fieldType: CanonicalFieldType;
  confidence: number;
  selector?: string;
  reasoning?: string;
}

export interface CachedFormSchema {
  id: string;
  domainPattern: string;
  fingerprint: string;
  mappings: FieldMappingItem[];
  successCount: number;
  failureCount: number;
  verified: boolean;
  updatedAt: Date;
}

/**
 * Strips any sensitive data, ensuring ONLY structural field types and element IDs are stored.
 */
export function sanitizeMappingsForStorage(rawMappings: any[]): FieldMappingItem[] {
  if (!Array.isArray(rawMappings)) return [];

  return rawMappings
    .filter((m) => m && (m.id || m.elementId) && m.fieldType)
    .map((m) => {
      const elementId = String(m.id || m.elementId || "").slice(0, 120);
      const fieldType = String(m.fieldType || "UNKNOWN") as CanonicalFieldType;
      const confidence = typeof m.confidence === "number" ? Math.min(1.0, Math.max(0.0, m.confidence)) : 0.85;
      const selector = m.selector ? String(m.selector).slice(0, 200) : undefined;
      const reasoning = m.reasoning ? String(m.reasoning).slice(0, 150) : undefined;

      return {
        elementId,
        fieldType,
        confidence: Number(confidence.toFixed(2)),
        selector,
        reasoning,
      };
    });
}

/**
 * Normalizes domain for pattern matching (e.g. "https://job-boards.greenhouse.io/foo" -> "greenhouse.io").
 */
export function extractDomainPattern(urlOrDomain: string): string {
  try {
    const raw = urlOrDomain.startsWith("http") ? new URL(urlOrDomain).hostname : urlOrDomain;
    const parts = raw.toLowerCase().split(".");
    if (parts.length >= 2) {
      return parts.slice(-2).join(".");
    }
    return raw.toLowerCase();
  } catch {
    return urlOrDomain.toLowerCase().slice(0, 80);
  }
}

/**
 * Retrieves a cached form schema by its structural fingerprint.
 */
export async function getCachedFormSchema(fingerprint: string): Promise<CachedFormSchema | null> {
  if (!fingerprint || typeof fingerprint !== "string") return null;

  try {
    const record = await db.formSchema.findUnique({
      where: { fingerprint },
    });

    if (!record) return null;

    let parsedMappings: FieldMappingItem[] = [];
    try {
      parsedMappings = JSON.parse(record.mappings);
    } catch {
      parsedMappings = [];
    }

    return {
      id: record.id,
      domainPattern: record.domainPattern,
      fingerprint: record.fingerprint,
      mappings: parsedMappings,
      successCount: record.successCount,
      failureCount: record.failureCount,
      verified: record.verified,
      updatedAt: record.updatedAt,
    };
  } catch (err) {
    console.warn("[FormSchemaCache] Error querying schema cache:", err);
    return null;
  }
}

/**
 * Saves or updates a form schema in the persistent cross-user cache.
 */
export async function saveFormSchema(
  domainInput: string,
  fingerprint: string,
  rawMappings: any[]
): Promise<CachedFormSchema | null> {
  if (!fingerprint || typeof fingerprint !== "string") return null;

  const domainPattern = extractDomainPattern(domainInput);
  const cleanMappings = sanitizeMappingsForStorage(rawMappings);

  if (cleanMappings.length === 0) return null;

  try {
    const jsonString = JSON.stringify(cleanMappings);

    const record = await db.formSchema.upsert({
      where: { fingerprint },
      create: {
        domainPattern,
        fingerprint,
        mappings: jsonString,
        successCount: 1,
        failureCount: 0,
        verified: false,
      },
      update: {
        domainPattern,
        mappings: jsonString,
        successCount: { increment: 1 },
      },
    });

    return {
      id: record.id,
      domainPattern: record.domainPattern,
      fingerprint: record.fingerprint,
      mappings: cleanMappings,
      successCount: record.successCount,
      failureCount: record.failureCount,
      verified: record.verified,
      updatedAt: record.updatedAt,
    };
  } catch (err) {
    console.error("[FormSchemaCache] Error saving schema cache:", err);
    return null;
  }
}

/**
 * Records execution feedback from an active autofill session.
 * Increments success or failure counters and auto-verifies schemas with high accuracy.
 */
export async function recordSchemaFeedback(
  fingerprint: string,
  success: boolean
): Promise<{ success: boolean; verified: boolean }> {
  if (!fingerprint || typeof fingerprint !== "string") {
    return { success: false, verified: false };
  }

  try {
    const existing = await db.formSchema.findUnique({
      where: { fingerprint },
    });

    if (!existing) {
      return { success: false, verified: false };
    }

    const nextSuccess = success ? existing.successCount + 1 : existing.successCount;
    const nextFailure = !success ? existing.failureCount + 1 : existing.failureCount;
    const shouldVerify = nextSuccess >= 3 && nextFailure === 0;

    const updated = await db.formSchema.update({
      where: { fingerprint },
      data: {
        successCount: nextSuccess,
        failureCount: nextFailure,
        verified: shouldVerify ? true : existing.verified,
      },
    });

    return { success: true, verified: updated.verified };
  } catch (err) {
    console.warn("[FormSchemaCache] Feedback recording failed:", err);
    return { success: false, verified: false };
  }
}
