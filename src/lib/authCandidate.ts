/**
 * Candidate Context Authorization & Security Module
 * 
 * Strict access control rules:
 * 1. Co-Developers: Roushan (playboxstation460@gmail.com) and Ayushi (ayushi29507@gmail.com).
 *    - Authorized to view, switch between, and manage BOTH 'roushan' and 'ayushi' candidate contexts.
 * 2. Third-Party Users:
 *    - Strictly isolated to their own profile (profile.userId === session.user.id).
 *    - Never allowed to view, query, score against, or download Roushan's or Ayushi's candidate profiles.
 * 3. Unauthenticated requests:
 *    - Blocked from candidate context endpoints.
 */

import { db } from "@/lib/db";

export const DEVELOPER_EMAILS = [
  "playboxstation460@gmail.com",
  "ayushi29507@gmail.com",
] as const;

export const DEVELOPER_PROFILE_SLUGS = [
  "roushan",
  "ayushi",
] as const;

/**
 * Checks whether the given email belongs to one of the engine co-developers.
 * Case-insensitive comparison.
 */
export function isDeveloperEmail(email?: string | null): boolean {
  if (!email || typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  return DEVELOPER_EMAILS.some((devEmail) => devEmail.toLowerCase() === normalized);
}

/**
 * Checks whether the given slug is a reserved developer profile slug ('roushan' | 'ayushi').
 */
export function isDeveloperProfileSlug(slug?: string | null): boolean {
  if (!slug || typeof slug !== "string") return false;
  const normalized = slug.trim().toLowerCase();
  return DEVELOPER_PROFILE_SLUGS.includes(normalized as typeof DEVELOPER_PROFILE_SLUGS[number]);
}

/**
 * Returns the default developer profile slug associated with a developer's email.
 */
export function getDeveloperDefaultSlug(email?: string | null): string {
  if (!email) return "roushan";
  const normalized = email.trim().toLowerCase();
  if (normalized === "ayushi29507@gmail.com") return "ayushi";
  return "roushan";
}

/**
 * Evaluates whether an authenticated session user has permission to access a candidate profile.
 * 
 * @param sessionUser The user object from NextAuth session (session?.user)
 * @param profile The target profile object containing slug and userId
 */
export function canAccessProfile(
  sessionUser: { id?: string | null; email?: string | null } | null | undefined,
  profile: { userId?: string | null; slug: string }
): boolean {
  if (!sessionUser || !sessionUser.id) {
    return false;
  }

  const isDev = isDeveloperEmail(sessionUser.email);

  if (isDev) {
    // Developers have dual access to both developer profiles
    if (isDeveloperProfileSlug(profile.slug)) {
      return true;
    }
    // Developers can also access any profile they own
    return profile.userId === sessionUser.id;
  }

  // Non-developer users MUST NEVER access developer profiles they do not own
  if (isDeveloperProfileSlug(profile.slug) && profile.userId !== sessionUser.id) {
    return false;
  }

  // Standard users can ONLY access profiles they personally own
  return Boolean(profile.userId && profile.userId === sessionUser.id);
}

/**
 * Resolves a candidate profile by slug while enforcing strict multi-tenant authorization.
 * Returns null if the profile doesn't exist or if the session user is unauthorized.
 */
export async function resolveAuthorizedProfile(
  sessionUser: { id?: string | null; email?: string | null } | null | undefined,
  requestedSlug?: string | null
) {
  if (!sessionUser || !sessionUser.id) {
    return null;
  }

  const isDev = isDeveloperEmail(sessionUser.email);

  // If no slug requested: default to user's profile or developer's own slug
  if (!requestedSlug || !requestedSlug.trim()) {
    if (isDev) {
      const defaultSlug = getDeveloperDefaultSlug(sessionUser.email);
      return db.profile.findUnique({
        where: { slug: defaultSlug },
        include: { projects: true, virtualExps: true },
      });
    }

    return db.profile.findFirst({
      where: { userId: sessionUser.id },
      include: { projects: true, virtualExps: true },
    });
  }

  const sanitizedSlug = requestedSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

  const profile = await db.profile.findUnique({
    where: { slug: sanitizedSlug },
    include: { projects: true, virtualExps: true },
  });

  if (!profile) {
    return null;
  }

  if (!canAccessProfile(sessionUser, profile)) {
    return null;
  }

  return profile;
}
