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
  setActiveProfileSlug: (slug: string) => void;
  setAllProfiles: (profiles: ProfileData[]) => void;
  updateActiveProfile: (data: Partial<ProfileData>) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  activeProfileSlug: "roushan",
  activeProfile: null,
  allProfiles: [],
  isLoading: true,

  setActiveProfileSlug: (slug) =>
    set((state) => {
      const matched = state.allProfiles.find((p) => p.slug === slug) || null;
      return { activeProfileSlug: slug, activeProfile: matched };
    }),

  setAllProfiles: (profiles) =>
    set((state) => {
      const active =
        profiles.find((p) => p.slug === state.activeProfileSlug) ||
        profiles[0] ||
        null;
      return {
        allProfiles: profiles,
        activeProfile: active,
        activeProfileSlug: active ? active.slug : state.activeProfileSlug,
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
