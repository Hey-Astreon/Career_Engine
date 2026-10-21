import { create } from "zustand";

export interface ProfileData {
  id: string;
  slug: string;
  fullName: string;
  title: string;
  email: string;
  phone: string | null;
  location: string;
  portfolioUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  masterResumePath: string;
  projects: Array<{
    id: string;
    title: string;
    techStack: string;
    liveDemoUrl: string | null;
    githubUrl: string | null;
    architecture: string;
    bulletPoints: string;
  }>;
  virtualExps: Array<{
    id: string;
    company: string;
    roleTitle: string;
    period: string;
    problemScope: string;
    actionTaken: string;
    outcome: string;
  }>;
}

interface ProfileState {
  activeProfileSlug: string;
  activeProfile: ProfileData | null;
  allProfiles: ProfileData[];
  isLoading: boolean;
  isDeveloper: boolean;
  userProfileSlug: string | null;
  setActiveProfileSlug: (slug: string) => void;
  setAllProfiles: (profiles: ProfileData[], userProfileSlug?: string | null, isDeveloper?: boolean) => void;
  updateActiveProfile: (data: Partial<ProfileData>) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  activeProfileSlug: "",
  activeProfile: null,
  allProfiles: [],
  isLoading: true,
  isDeveloper: false,
  userProfileSlug: null,

  setActiveProfileSlug: (slug) =>
    set((state) => {
      const matched = state.allProfiles.find((p) => p.slug === slug) || null;
      return { activeProfileSlug: slug, activeProfile: matched };
    }),

  setAllProfiles: (profiles, userProfileSlug, isDeveloper) =>
    set((state) => {
      const targetSlug =
        userProfileSlug ||
        state.activeProfileSlug ||
        profiles[0]?.slug ||
        "";
      const active =
        profiles.find((p) => p.slug === targetSlug) ||
        profiles[0] ||
        null;
      return {
        allProfiles: profiles,
        activeProfile: active,
        activeProfileSlug: active ? active.slug : "",
        userProfileSlug: userProfileSlug !== undefined ? userProfileSlug : state.userProfileSlug,
        isDeveloper: isDeveloper !== undefined ? isDeveloper : state.isDeveloper,
        isLoading: false,
      };
    }),

  updateActiveProfile: (data) =>
    set((state) => {
      if (!state.activeProfile) return state;
      const updatedActive = { ...state.activeProfile, ...data };
      const updatedAll = state.allProfiles.map((p) =>
        p.id === updatedActive.id ? updatedActive : p
      );
      return {
        activeProfile: updatedActive,
        allProfiles: updatedAll,
      };
    }),

  setIsLoading: (loading) => set({ isLoading: loading }),
}));
