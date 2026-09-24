import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your AstreWork account to access your remote job pipeline, ATS resumes, and auto-sync.",
  alternates: {
    canonical: "/login",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
