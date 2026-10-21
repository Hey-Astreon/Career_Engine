import { describe, it, expect } from "vitest";
import {
  isDeveloperEmail,
  isDeveloperProfileSlug,
  getDeveloperDefaultSlug,
  canAccessProfile,
  DEVELOPER_EMAILS,
  DEVELOPER_PROFILE_SLUGS,
} from "@/lib/authCandidate";
import { getMasterResumeBaseline } from "@/lib/resumeBaseline";

describe("Candidate Context Privacy & Authorization Suite", () => {
  describe("Developer Identification", () => {
    it("recognizes Roushan's email as developer in all formats", () => {
      expect(isDeveloperEmail("playboxstation460@gmail.com")).toBe(true);
      expect(isDeveloperEmail("Playboxstation460@gmail.com")).toBe(true);
      expect(isDeveloperEmail(" PLAYBOXSTATION460@GMAIL.COM ")).toBe(true);
    });

    it("recognizes Ayushi's email as developer in all formats", () => {
      expect(isDeveloperEmail("ayushi29507@gmail.com")).toBe(true);
      expect(isDeveloperEmail("Ayushi29507@gmail.com")).toBe(true);
      expect(isDeveloperEmail(" AYUSHI29507@GMAIL.COM ")).toBe(true);
    });

    it("rejects non-developer emails", () => {
      expect(isDeveloperEmail("john.doe@example.com")).toBe(false);
      expect(isDeveloperEmail("recruiter@google.com")).toBe(false);
      expect(isDeveloperEmail("roushan@other.com")).toBe(false);
      expect(isDeveloperEmail("")).toBe(false);
      expect(isDeveloperEmail(null)).toBe(false);
      expect(isDeveloperEmail(undefined)).toBe(false);
    });

    it("correctly checks developer slugs", () => {
      expect(isDeveloperProfileSlug("roushan")).toBe(true);
      expect(isDeveloperProfileSlug("ROUSHAN")).toBe(true);
      expect(isDeveloperProfileSlug("ayushi")).toBe(true);
      expect(isDeveloperProfileSlug("AYUSHI")).toBe(true);
      expect(isDeveloperProfileSlug("john-doe")).toBe(false);
      expect(isDeveloperProfileSlug("")).toBe(false);
      expect(isDeveloperProfileSlug(null)).toBe(false);
    });

    it("maps default slug to developer email", () => {
      expect(getDeveloperDefaultSlug("playboxstation460@gmail.com")).toBe("roushan");
      expect(getDeveloperDefaultSlug("ayushi29507@gmail.com")).toBe("ayushi");
      expect(getDeveloperDefaultSlug("unknown@example.com")).toBe("roushan");
    });
  });

  describe("canAccessProfile Access Control Matrix", () => {
    const roushanProfile = {
      id: "prof-roushan-id",
      userId: "ca0d442b-2689-4eb3-b43e-69438b7b9deb",
      slug: "roushan",
    };

    const ayushiProfile = {
      id: "prof-ayushi-id",
      userId: "169f3065-cc48-42c8-825a-9efd906227f7",
      slug: "ayushi",
    };

    const thirdPartyUser = {
      id: "usr-third-party-123",
      email: "candidate@gmail.com",
    };

    const thirdPartyProfile = {
      id: "prof-third-party-id",
      userId: "usr-third-party-123",
      slug: "candidate-123",
    };

    const otherUserProfile = {
      id: "prof-other-user-id",
      userId: "usr-other-456",
      slug: "other-user-456",
    };

    const roushanSession = {
      id: "ca0d442b-2689-4eb3-b43e-69438b7b9deb",
      email: "playboxstation460@gmail.com",
    };

    const ayushiSession = {
      id: "169f3065-cc48-42c8-825a-9efd906227f7",
      email: "ayushi29507@gmail.com",
    };

    it("allows Roushan to access both Roushan and Ayushi profiles (Dual Co-Ownership)", () => {
      expect(canAccessProfile(roushanSession, roushanProfile)).toBe(true);
      expect(canAccessProfile(roushanSession, ayushiProfile)).toBe(true);
    });

    it("allows Ayushi to access both Ayushi and Roushan profiles (Dual Co-Ownership)", () => {
      expect(canAccessProfile(ayushiSession, ayushiProfile)).toBe(true);
      expect(canAccessProfile(ayushiSession, roushanProfile)).toBe(true);
    });

    it("STRICTLY BLOCKS third-party users from accessing Roushan's profile", () => {
      expect(canAccessProfile(thirdPartyUser, roushanProfile)).toBe(false);
    });

    it("STRICTLY BLOCKS third-party users from accessing Ayushi's profile", () => {
      expect(canAccessProfile(thirdPartyUser, ayushiProfile)).toBe(false);
    });

    it("allows third-party user to access their OWN profile", () => {
      expect(canAccessProfile(thirdPartyUser, thirdPartyProfile)).toBe(true);
    });

    it("blocks third-party user from accessing another third-party user's profile", () => {
      expect(canAccessProfile(thirdPartyUser, otherUserProfile)).toBe(false);
    });

    it("blocks unauthenticated users (null session) from accessing any profile", () => {
      expect(canAccessProfile(null, roushanProfile)).toBe(false);
      expect(canAccessProfile(null, ayushiProfile)).toBe(false);
      expect(canAccessProfile(null, thirdPartyProfile)).toBe(false);
      expect(canAccessProfile(undefined, roushanProfile)).toBe(false);
    });
  });

  describe("Master Resume Baseline Isolation", () => {
    it("returns Roushan's master baseline for 'roushan' slug", () => {
      const baseline = getMasterResumeBaseline("roushan");
      expect(baseline.header.fullName).toBe("ROUSHAN KUMAR");
      expect(baseline.header.email).toBe("roushanraut404@gmail.com");
      expect(baseline.tailoringNotes).toBe("Master Profile Baseline");
    });

    it("returns Ayushi's master baseline for 'ayushi' slug", () => {
      const baseline = getMasterResumeBaseline("ayushi");
      expect(baseline.header.fullName).toBe("AYUSHI RAJ");
      expect(baseline.header.email).toBe("ayushi29507@gmail.com");
      expect(baseline.tailoringNotes).toBe("Master Profile Baseline");
    });

    it("returns isolated custom baseline for third-party slug that NEVER leaks developer details", () => {
      const thirdPartyCustomData = {
        fullName: "Jane Doe",
        title: "Frontend Developer",
        email: "jane.doe@example.com",
        location: "Toronto, Canada",
        phone: "+1-416-555-0199",
      };

      const baseline = getMasterResumeBaseline("jane-doe-4a1b", thirdPartyCustomData);

      // Verify custom candidate data
      expect(baseline.header.fullName).toBe("Jane Doe");
      expect(baseline.header.email).toBe("jane.doe@example.com");
      expect(baseline.header.location).toBe("Toronto, Canada");
      expect(baseline.header.targetHeadline).toBe("Frontend Developer");

      // Verify NO leakage of Roushan or Ayushi details
      expect(baseline.header.fullName).not.toBe("ROUSHAN KUMAR");
      expect(baseline.header.fullName).not.toBe("AYUSHI RAJ");
      expect(baseline.header.email).not.toBe("roushanraut404@gmail.com");
      expect(baseline.header.email).not.toBe("playboxstation460@gmail.com");
      expect(baseline.header.email).not.toBe("ayushi29507@gmail.com");
      expect(baseline.header.phone).not.toBe("+91-9431483512");
      expect(baseline.header.phone).not.toBe("+91-8709852305");
      expect(baseline.tailoringNotes).toBe("Custom Candidate Profile Baseline");
    });
  });
});
