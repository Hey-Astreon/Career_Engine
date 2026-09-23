import { ProfileData } from "@/store/useProfileStore";

/**
 * Generates an auto-fill URL for supported ATS platforms based on candidate profile data.
 * If the platform is not supported, it returns the original URL.
 * 
 * @param originalUrl - The original application URL of the job.
 * @param platformName - The identified ATS platform name (e.g., "Greenhouse", "Lever").
 * @param profile - The candidate's active profile data.
 * @returns An object containing the generated auto-fill URL and a boolean indicating if auto-fill is supported.
 */
export function generateAtsAutoFillUrl(
  originalUrl: string,
  platformName: string,
  profile: ProfileData | null
): { autoFillUrl: string; isSupported: boolean } {
  if (!profile || !originalUrl) {
    return { autoFillUrl: originalUrl, isSupported: false };
  }

  try {
    const url = new URL(originalUrl);
    const platform = platformName.toLowerCase();
    
    // Split full name safely
    const nameParts = profile.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
    const currentCompany = profile.virtualExps && profile.virtualExps.length > 0 ? profile.virtualExps[0].company : "";

    let isSupported = false;

    if (platform.includes("greenhouse") || originalUrl.includes("boards.greenhouse.io")) {
      isSupported = true;
      if (firstName) url.searchParams.set("first_name", firstName);
      if (lastName) url.searchParams.set("last_name", lastName);
      if (profile.email) url.searchParams.set("email", profile.email);
      if (profile.phone) url.searchParams.set("phone", profile.phone);
      if (profile.linkedinUrl) url.searchParams.set("linkedin_profile", profile.linkedinUrl);
      if (profile.githubUrl) url.searchParams.set("website", profile.githubUrl);
    } 
    else if (platform.includes("lever") || originalUrl.includes("jobs.lever.co")) {
      isSupported = true;
      if (profile.fullName) url.searchParams.set("name", profile.fullName);
      if (profile.email) url.searchParams.set("email", profile.email);
      if (profile.phone) url.searchParams.set("phone", profile.phone);
      if (currentCompany) url.searchParams.set("org", currentCompany);
      if (profile.linkedinUrl) url.searchParams.set("urls.LinkedIn", profile.linkedinUrl);
      if (profile.githubUrl) url.searchParams.set("urls.GitHub", profile.githubUrl);
      if (profile.portfolioUrl) url.searchParams.set("urls.Portfolio", profile.portfolioUrl);
    }
    else if (platform.includes("ashby") || originalUrl.includes("jobs.ashbyhq.com")) {
      isSupported = true;
      if (profile.fullName) url.searchParams.set("name", profile.fullName);
      if (profile.email) url.searchParams.set("email", profile.email);
      if (profile.phone) url.searchParams.set("phone", profile.phone);
      if (profile.linkedinUrl) url.searchParams.set("linkedin", profile.linkedinUrl);
      if (profile.githubUrl) url.searchParams.set("github", profile.githubUrl);
      if (profile.portfolioUrl) url.searchParams.set("website", profile.portfolioUrl);
    }
    else if (platform.includes("workable") || originalUrl.includes("apply.workable.com")) {
      isSupported = true;
      if (firstName) url.searchParams.set("firstname", firstName);
      if (lastName) url.searchParams.set("lastname", lastName);
      if (profile.email) url.searchParams.set("email", profile.email);
      if (profile.phone) url.searchParams.set("phone", profile.phone);
      if (profile.location) url.searchParams.set("address", profile.location);
    }

    return { autoFillUrl: url.toString(), isSupported };
  } catch (error) {
    // If URL parsing fails, return original
    return { autoFillUrl: originalUrl, isSupported: false };
  }
}
