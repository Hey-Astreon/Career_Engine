import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding | Setup Your Career Engine",
  description: "Set up your candidate profile, target roles, and preferred remote job platforms with AstreWork.",
  alternates: {
    canonical: "/onboard",
  },
};

export default function OnboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
