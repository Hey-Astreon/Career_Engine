import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding | Setup Your Stride Workspace",
  description: "Set up your candidate profile, target roles, and preferred remote job platforms with Stride.",
  alternates: {
    canonical: "/onboard",
  },
};

export default function OnboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
